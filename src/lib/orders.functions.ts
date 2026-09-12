import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { createLovableAI, DEFAULT_CHAT_MODEL } from "@/lib/ai-gateway.server";

const SpamOutput = z.object({
  is_spam: z.boolean(),
  reason: z.string(),
});

async function screenOrderForSpam(payload: {
  contact_email: string;
  contact_phone: string | null;
  shipping_address: { full_name: string; line1: string; city: string; country: string; phone?: string };
  notes: string | null;
  total_cents: number;
  items: Array<{ name: string; quantity: number }>;
}): Promise<{ is_spam: boolean; reason: string }> {
  try {
    const ai = createLovableAI(true);
    const { output } = await generateText({
      model: ai(DEFAULT_CHAT_MODEL),
      output: Output.object({ schema: SpamOutput }),
      prompt: `You are a fraud/spam screener for a luxury fashion e-commerce (Egypt, cash-on-delivery). Flag ONLY orders that are clearly fake, joke, gibberish, or abusive. Legitimate Arabic/English names and normal Egyptian addresses are NOT spam. Return is_spam=true only when confident.

Order:
- Email: ${payload.contact_email}
- Phone: ${payload.contact_phone ?? payload.shipping_address.phone ?? "—"}
- Name: ${payload.shipping_address.full_name}
- Address: ${payload.shipping_address.line1}, ${payload.shipping_address.city}, ${payload.shipping_address.country}
- Notes: ${payload.notes ?? "—"}
- Total (EGP): ${(payload.total_cents / 100).toFixed(0)}
- Items: ${payload.items.map((i) => `${i.quantity}x ${i.name}`).join("; ")}

Spam signals: gibberish name (e.g. "asdasd", "test test"), fake address ("xxx", "123"), throwaway/joke email, abusive notes, obviously fake phone (all same digit).`,
    });
    return output;
  } catch (err) {
    if (NoObjectGeneratedError.isInstance(err)) return { is_spam: false, reason: "screen-failed" };
    console.error("spam screen failed", err);
    return { is_spam: false, reason: "screen-error" };
  }
}


const shippingAddressSchema = z.object({
  full_name: z.string().min(1).max(120),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  city: z.string().min(1).max(120),
  region: z.string().max(120).optional(),
  postal_code: z.string().max(30).optional().default("-"),
  country: z.string().min(1).max(80),
  phone: z.string().max(40).optional(),
});

const itemSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  image: z.string().min(1),
  price_cents: z.number().int().nonnegative(),
  size: z.string().optional(),
  color: z.string().optional(),
  quantity: z.number().int().positive().max(20),
});

const createOrderSchema = z.object({
  contact_email: z.string().email(),
  contact_phone: z.string().max(40).optional(),
  shipping_address: shippingAddressSchema,
  items: z.array(itemSchema).min(1).max(50),
  notes: z.string().max(500).optional(),
  payment_method: z.enum(["cod", "vodafone_cash"]).default("cod"),
  payment_reference: z.string().trim().max(80).optional(),
});

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createOrderSchema.parse(input))
  .handler(async ({ data }) => {
    // Guest checkout: no auth required. If a bearer token is present, resolve
    // the user id so signed-in customers still see the order in their account.
    let userId: string | null = null;
    try {
      const { getRequestHeader } = await import("@tanstack/react-start/server");
      const auth = getRequestHeader("authorization");
      if (auth?.toLowerCase().startsWith("bearer ")) {
        const token = auth.slice(7);
        const { createClient } = await import("@supabase/supabase-js");
        const sb = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_PUBLISHABLE_KEY!,
          { auth: { persistSession: false, autoRefreshToken: false } },
        );
        const { data: u } = await sb.auth.getUser(token);
        userId = u.user?.id ?? null;
      }
    } catch {
      userId = null;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const supabase = supabaseAdmin;



    // Resolve product IDs from slugs & recompute prices server-side
    const slugs = Array.from(new Set(data.items.map((i) => i.slug)));
    const { data: prods } = await supabase
      .from("products")
      .select("id, slug, price_cents, name")
      .in("slug", slugs);
    const bySlug = new Map((prods ?? []).map((p) => [p.slug, p]));

    let subtotal = 0;
    const resolvedItems = data.items.map((it) => {
      const p = bySlug.get(it.slug);
      const unit = p?.price_cents ?? it.price_cents;
      subtotal += unit * it.quantity;
      return {
        product_id: p?.id ?? null,
        product_snapshot: {
          slug: it.slug,
          name: p?.name ?? it.name,
          image: it.image,
        },
        size: it.size ?? null,
        color: it.color ?? null,
        quantity: it.quantity,
        unit_price_cents: unit,
      };
    });

    // AI spam / fraud screen — soft flag only (never block the customer)
    const spam = await screenOrderForSpam({
      contact_email: data.contact_email,
      contact_phone: data.contact_phone ?? null,
      shipping_address: data.shipping_address,
      notes: data.notes ?? null,
      total_cents: subtotal,
      items: resolvedItems.map((it) => ({
        name: it.product_snapshot.name,
        quantity: it.quantity,
      })),
    });
    const flaggedNotes = spam.is_spam
      ? `[AI-FLAG: ${spam.reason}] ${data.notes ?? ""}`.trim()
      : (data.notes ?? null);

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        shipping_address: data.shipping_address,
        subtotal_cents: subtotal,
        shipping_cents: 0,
        tax_cents: 0,
        total_cents: subtotal,
        status: "pending",
        notes: flaggedNotes,
        payment_method: data.payment_method,
        payment_reference:
          data.payment_method === "vodafone_cash"
            ? (data.payment_reference ?? null)
            : null,
      })
      .select("id, order_number, total_cents")
      .single();


    if (error || !order) {
      throw new Error(error?.message ?? "Failed to create order");
    }

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(resolvedItems.map((it) => ({ ...it, order_id: order.id })));

    if (itemsErr) {
      throw new Error(itemsErr.message);
    }

    // Fire Telegram notification (best-effort; never blocks the order response)
    try {
      const { notifyNewOrder } = await import("@/lib/notifications.functions");
      await notifyNewOrder({
        id: order.id,
        order_number: order.order_number,
        total_cents: order.total_cents,
        subtotal_cents: subtotal,
        shipping_cents: 0,
        contact_email: data.contact_email,
        contact_phone: data.contact_phone ?? null,
        shipping_address: data.shipping_address,
        notes: flaggedNotes,
        items: resolvedItems.map((it) => ({
          name: it.product_snapshot.name,
          size: it.size,
          color: it.color,
          quantity: it.quantity,
        })),
      });
    } catch (e) {
      console.error("notifyNewOrder failed", e);
    }

    return {
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
    };
  });

export const listMyOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data, error } = await context.supabase
        .from("orders")
        .select(
          "id, order_number, status, total_cents, currency, created_at, order_items(product_snapshot, size, quantity, unit_price_cents)",
        )
        .order("created_at", { ascending: false });
      if (!error && data) return data;
    } catch {}
    return [];
  });

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { data, error } = await context.supabase
        .from("profiles")
        .select("id, full_name, phone, avatar_url")
        .eq("id", context.userId)
        .maybeSingle();
      if (!error && data) return data;
    } catch {}
    const email = (context.claims as any)?.email;
    return {
      id: context.userId,
      full_name: email ? email.split("@")[0] : "عميل GZAF",
      phone: null,
      avatar_url: null,
    };
  });

const updateProfileSchema = z.object({
  full_name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
});

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    try {
      await context.supabase
        .from("profiles")
        .update({
          full_name: data.full_name ?? null,
          phone: data.phone ?? null,
        })
        .eq("id", context.userId);
    } catch {}
    return { ok: true };
  });

// Public order tracking — no auth. Requires BOTH order number and the phone
// used at checkout, so guests can retrieve their orders while random probing
// is blocked (order numbers alone won't leak details).
const trackSchema = z.object({
  order_number: z.string().trim().min(3).max(40),
  phone: z.string().trim().min(4).max(40),
});

function normalizePhone(p: string) {
  return p.replace(/[^\d]/g, "");
}

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => trackSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .select(
        "id, order_number, status, total_cents, currency, created_at, contact_phone, shipping_address, order_items(product_snapshot, size, quantity, unit_price_cents)",
      )
      .eq("order_number", data.order_number.trim())
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order) throw new Error("لم يتم العثور على الطلب.");

    const stored = normalizePhone(order.contact_phone ?? "");
    const shippingPhone = normalizePhone(
      (order.shipping_address as { phone?: string } | null)?.phone ?? "",
    );
    const query = normalizePhone(data.phone);
    const matches =
      query.length >= 4 &&
      (stored.endsWith(query) ||
        shippingPhone.endsWith(query) ||
        query.endsWith(stored) ||
        query.endsWith(shippingPhone));
    if (!matches) throw new Error("رقم الهاتف لا يطابق الطلب.");

    return {
      order_number: order.order_number,
      status: order.status,
      total_cents: order.total_cents,
      currency: order.currency,
      created_at: order.created_at,
      shipping_address: order.shipping_address,
      order_items: order.order_items,
    };
  });

