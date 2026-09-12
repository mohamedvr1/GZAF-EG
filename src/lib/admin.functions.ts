import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden");
}

// ---------- Role check ----------
export const checkIsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data } = await context.supabase.rpc("has_role", {
        _user_id: context.userId,
        _role: "admin",
      });
      return { isAdmin: !!data };
    } catch {
      return { isAdmin: false };
    }
  });

// ---------- Overview stats ----------
export const getAdminStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [orders, products, apps, subs, reviews] = await Promise.all([
      context.supabase.from("orders").select("id, total_cents, status, created_at"),
      context.supabase.from("products").select("id", { count: "exact", head: true }),
      context.supabase.from("atelier_applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
      context.supabase.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("is_active", true),
      context.supabase.from("product_reviews").select("id", { count: "exact", head: true }),
    ]);
    const orderRows = orders.data ?? [];
    const revenueCents = orderRows.reduce((s: number, o: any) => s + (o.total_cents ?? 0), 0);
    return {
      revenueCents,
      ordersCount: orderRows.length,
      productsCount: products.count ?? 0,
      pendingApplications: apps.count ?? 0,
      newsletterCount: subs.count ?? 0,
      reviewsCount: reviews.count ?? 0,
      recentOrders: orderRows
        .sort((a: any, b: any) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5),
    };
  });

// ---------- Orders ----------
export const adminListOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("orders")
      .select("id, order_number, status, total_cents, currency, contact_email, created_at, user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const orderStatusSchema = z.object({
  order_id: z.string().uuid(),
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
});

export const adminUpdateOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => orderStatusSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("orders")
      .update({ status: data.status })
      .eq("id", data.order_id);
    if (error) throw new Error(error.message);
    const { logAuditEvent } = await import("@/lib/audit.server");
    await logAuditEvent({
      actorId: context.userId,
      action: "order.status_update",
      entityType: "order",
      entityId: data.order_id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });


// ---------- Products ----------
export const adminListProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("products")
      .select("id, slug, name, price_cents, currency, is_active, category_id, categories(name), product_variants(id, sku, size, color, stock, is_active)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const productToggleSchema = z.object({
  product_id: z.string().uuid(),
  is_active: z.boolean(),
});

export const adminToggleProduct = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => productToggleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("products")
      .update({ is_active: data.is_active })
      .eq("id", data.product_id);
    if (error) throw new Error(error.message);
    const { logAuditEvent } = await import("@/lib/audit.server");
    await logAuditEvent({
      actorId: context.userId,
      action: "product.toggle",
      entityType: "product",
      entityId: data.product_id,
      metadata: { is_active: data.is_active },
    });
    return { ok: true };
  });


const variantCreateSchema = z.object({
  product_id: z.string().uuid(),
  sku: z.string().min(1).max(80),
  size: z.string().max(30).optional(),
  color: z.string().max(30).optional(),
  stock: z.number().int().nonnegative(),
});

export const adminCreateVariant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => variantCreateSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("product_variants").insert({
      product_id: data.product_id,
      sku: data.sku,
      size: data.size ?? null,
      color: data.color ?? null,
      stock: data.stock,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const variantStockSchema = z.object({
  variant_id: z.string().uuid(),
  stock: z.number().int().nonnegative(),
});

export const adminUpdateVariantStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => variantStockSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: updated, error } = await context.supabase
      .from("product_variants")
      .update({ stock: data.stock })
      .eq("id", data.variant_id)
      .select("sku, size, color, stock, products(name)")
      .maybeSingle();
    if (error) throw new Error(error.message);

    if (updated) {
      try {
        const { notifyLowStock } = await import("@/lib/notifications.functions");
        const product = Array.isArray(updated.products) ? updated.products[0] : updated.products;
        await notifyLowStock({
          sku: updated.sku,
          product_name: product?.name ?? "Unknown piece",
          size: updated.size,
          color: updated.color,
          stock: updated.stock,
        });
      } catch (e) {
        console.error("notifyLowStock failed", e);
      }
    }
    return { ok: true };
  });

// ---------- Coupons ----------
export const adminListCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const couponCreateSchema = z.object({
  code: z.string().min(2).max(40).regex(/^[A-Z0-9_-]+$/i),
  description: z.string().max(200).optional(),
  discount_type: z.enum(["percent", "fixed"]),
  discount_value: z.number().positive(),
  min_order_amount: z.number().nonnegative().default(0),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().optional(),
});

export const adminCreateCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => couponCreateSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("coupons").insert({
      code: data.code.toUpperCase(),
      description: data.description ?? null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      min_order_amount: data.min_order_amount ?? 0,
      max_uses: data.max_uses ?? null,
      expires_at: data.expires_at ?? null,
    });
    if (error) throw new Error(error.message);
    const { logAuditEvent } = await import("@/lib/audit.server");
    await logAuditEvent({
      actorId: context.userId,
      action: "coupon.create",
      entityType: "coupon",
      entityId: data.code.toUpperCase(),
      metadata: { discount_type: data.discount_type, discount_value: data.discount_value },
    });
    return { ok: true };
  });


const couponToggleSchema = z.object({
  coupon_id: z.string().uuid(),
  is_active: z.boolean(),
});

export const adminToggleCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => couponToggleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("coupons")
      .update({ is_active: data.is_active })
      .eq("id", data.coupon_id);
    if (error) throw new Error(error.message);
    const { logAuditEvent } = await import("@/lib/audit.server");
    await logAuditEvent({
      actorId: context.userId,
      action: "coupon.toggle",
      entityType: "coupon",
      entityId: data.coupon_id,
      metadata: { is_active: data.is_active },
    });
    return { ok: true };
  });


// ---------- Atelier Applications ----------
export const adminListApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("atelier_applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const appStatusSchema = z.object({
  application_id: z.string().uuid(),
  status: z.enum(["pending", "reviewing", "approved", "rejected"]),
  admin_notes: z.string().max(1000).optional(),
});

export const adminUpdateApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => appStatusSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("atelier_applications")
      .update({
        status: data.status,
        admin_notes: data.admin_notes ?? null,
      })
      .eq("id", data.application_id);
    if (error) throw new Error(error.message);
    const { logAuditEvent } = await import("@/lib/audit.server");
    await logAuditEvent({
      actorId: context.userId,
      action: "atelier_application.update",
      entityType: "atelier_application",
      entityId: data.application_id,
      metadata: { status: data.status },
    });
    return { ok: true };
  });


// ---------- Newsletter ----------
export const adminListSubscribers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---------- Reviews Moderation ----------
export const adminListReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data, error } = await context.supabase
      .from("product_reviews")
      .select("id, rating, title, body, is_published, is_verified_purchase, created_at, product_id, user_id, products(name, slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const reviewToggleSchema = z.object({
  review_id: z.string().uuid(),
  is_published: z.boolean(),
});

export const adminToggleReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => reviewToggleSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase
      .from("product_reviews")
      .update({ is_published: data.is_published })
      .eq("id", data.review_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
