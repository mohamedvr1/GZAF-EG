import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { TelegramInlineButton } from "@/lib/telegram.server";

// Fetch the singleton settings row using the service role so server code can
// notify without exposing the settings to non-admin sessions.
async function loadSettings() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("notification_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden");
}

// -------- Admin: read/update settings --------
export const getNotificationSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = await loadSettings();
    return s;
  });

const updateSchema = z.object({
  telegram_admin_chat_ids: z.array(z.string().min(1).max(40)).max(20),
  notify_new_orders: z.boolean(),
  notify_atelier_applications: z.boolean(),
  notify_low_stock: z.boolean(),
  low_stock_threshold: z.number().int().min(0).max(1000),
});

export const updateNotificationSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => updateSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const current = await loadSettings();
    if (!current) throw new Error("Settings row missing");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("notification_settings")
      .update(data)
      .eq("id", current.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Admin: test broadcast --------
export const sendTestTelegram = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = await loadSettings();
    if (!s || s.telegram_admin_chat_ids.length === 0) {
      return { ok: false, error: "No chat IDs configured", sent: 0 };
    }
    const { broadcastTelegram } = await import("@/lib/telegram.server");
    const msg = [
      "<b>GZAF · Telegram test</b>",
      "",
      "Notifications are wired. You will receive live atelier alerts here.",
    ].join("\n");
    await broadcastTelegram(s.telegram_admin_chat_ids, msg);
    return { ok: true, sent: s.telegram_admin_chat_ids.length };
  });

// -------- Internal helpers used by other server functions --------
function fmtEGP(cents: number) {
  return `${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 0 })} EGP`;
}

function cairoDateTime(): { date: string; time: string } {
  const now = new Date();
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Cairo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);
  return { date, time };
}

function egyptWhatsAppUrl(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  const normalized = digits.startsWith("20")
    ? digits
    : digits.startsWith("0")
      ? `20${digits.slice(1)}`
      : digits.length === 10
        ? `20${digits}`
        : digits;
  return normalized.length >= 11 ? `https://wa.me/${normalized}` : null;
}

type ShippingAddress = {
  full_name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  region?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
};

export async function notifyNewOrder(order: {
  id?: string;
  order_number: string | number;
  total_cents: number;
  subtotal_cents?: number;
  shipping_cents?: number;
  contact_email: string;
  contact_phone?: string | null;
  shipping_address?: ShippingAddress | null;
  notes?: string | null;
  items: Array<{ name: string; size?: string | null; color?: string | null; quantity: number }>;
}) {
  const s = await loadSettings();
  if (!s?.notify_new_orders || s.telegram_admin_chat_ids.length === 0) return;
  const { broadcastTelegram, escapeTelegramHtml: h } = await import("@/lib/telegram.server");

  const { date, time } = cairoDateTime();
  const addr = order.shipping_address ?? {};
  const customerName = addr.full_name ?? "—";
  const phone = (addr.phone ?? order.contact_phone ?? "").trim();
  const phoneDisplay = phone || "—";
  const governorate = addr.region ?? "—";
  const city = addr.city ?? "—";
  const streetLines = [addr.line1, addr.line2].filter(Boolean).join("، ") || "—";

  const rule = "━━━━━━━━━━━━━━━━━━";
  const shippingCents = order.shipping_cents ?? 0;
  const subtotalCents = order.subtotal_cents ?? order.total_cents - shippingCents;
  const shippingLabel = shippingCents === 0 ? "Complimentary" : fmtEGP(shippingCents);

  const productBlock =
    order.items.length === 1
      ? [
          `• Product: <b>${h(order.items[0].name)}</b>`,
          `• Color: ${h(order.items[0].color ?? "—")}`,
          `• Size: ${h(order.items[0].size ?? "—")}`,
          `• Quantity: ×${order.items[0].quantity}`,
        ].join("\n")
      : order.items
          .map((it, i) => {
            const variant = [it.color, it.size].filter(Boolean).join(" · ");
            return `• <b>${String(i + 1).padStart(2, "0")}.</b> ${h(it.name)}${variant ? ` — ${h(variant)}` : ""} ×${it.quantity}`;
          })
          .join("\n");

  const msg = [
    "🔥 <b>NEW GZAF ORDER</b>",
    "",
    rule,
    "",
    "📦 <b>Order ID</b>",
    `<code>${h(String(order.order_number))}</code>`,
    "",
    "🕒 <b>Order Time</b>",
    `${h(date)} • ${h(time)}`,
    "",
    rule,
    "",
    "👤 <b>Customer</b>",
    "",
    `• Name: <b>${h(customerName)}</b>`,
    `• Phone: <code>${h(phoneDisplay)}</code>`,
    `• Email: <i>${h(order.contact_email)}</i>`,
    "",
    rule,
    "",
    "📍 <b>Delivery Address</b>",
    "",
    `• Address: ${h(streetLines)}`,
    `• City: ${h(city)}`,
    `• Governorate: ${h(governorate)}`,
    "",
    rule,
    "",
    order.items.length === 1 ? "🛍️ <b>Order Details</b>" : `🛍️ <b>Order Details</b> · ${order.items.length}`,
    "",
    productBlock,
    "",
    rule,
    "",
    "💰 <b>Payment</b>",
    "",
    `Subtotal: <b>${fmtEGP(subtotalCents)}</b>`,
    `Shipping: <b>${shippingLabel}</b>`,
    "━━━━━━━━━━━━",
    `<b>TOTAL: ${fmtEGP(order.total_cents)}</b>`,
    "",
    "Method: <i>Cash on Delivery</i>",
    "",
    rule,
    "",
    "📝 <b>Notes</b>",
    "",
    order.notes?.trim() ? h(order.notes.trim()) : "— No Notes —",
    "",
    rule,
    "",
    "📦 <b>Current Status</b>",
    "",
    "🟡 Pending Approval — استخدم الأزرار بالأسفل",

  ].join("\n");

  // Inline keyboard — quick actions for the atelier ops team
  const adminBase = (process.env.SITE_URL ?? "https://salam-heart-hub.lovable.app").replace(/\/$/, "");
  const ordersUrl = `${adminBase}/admin/orders`;
  const contactUrl = phone ? egyptWhatsAppUrl(phone) : null;
  const mapsQuery = encodeURIComponent([streetLines, city, governorate, "Egypt"].filter(Boolean).join(", "));
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`;

  const orderId = order.id ?? "";
  const row1: TelegramInlineButton[] = orderId
    ? [
        { text: "✅ Approve", callback_data: `approve:${orderId}` },
        { text: "❌ Reject", callback_data: `reject:${orderId}` },
      ]
    : [{ text: "👁 View Order", url: ordersUrl }];
  const row2: TelegramInlineButton[] = [
    { text: "👁 View Order", url: ordersUrl },
    ...(contactUrl ? [{ text: "📞 Call Customer", url: contactUrl } as TelegramInlineButton] : []),
  ];
  const row3: TelegramInlineButton[] = [
    { text: "📍 Open Maps", url: mapsUrl },
    { text: "🧾 Invoice", url: ordersUrl },
  ];

  await broadcastTelegram(s.telegram_admin_chat_ids, msg, {
    inline_keyboard: [row1, row2, row3],
  });
}

export async function notifyLowStock(variant: {
  sku: string;
  product_name: string;
  size?: string | null;
  color?: string | null;
  stock: number;
}) {
  const s = await loadSettings();
  if (!s?.notify_low_stock || s.telegram_admin_chat_ids.length === 0) return;
  if (variant.stock > s.low_stock_threshold) return;
  const { broadcastTelegram, escapeTelegramHtml } = await import("@/lib/telegram.server");
  const details = [variant.size, variant.color].filter(Boolean).join(" · ");
  const msg = [
    "<b>⚠ Low stock · GZAF</b>",
    "",
    `<b>Piece</b> ${escapeTelegramHtml(variant.product_name)}`,
    `<b>SKU</b> ${escapeTelegramHtml(variant.sku)}`,
    details ? `<b>Variant</b> ${escapeTelegramHtml(details)}` : "",
    `<b>Remaining</b> ${variant.stock}`,
  ].filter(Boolean).join("\n");
  await broadcastTelegram(s.telegram_admin_chat_ids, msg);
}

export async function notifyAtelierApplication(app: {
  brand_name: string;
  contact_email: string;
  city?: string | null;
}) {
  const s = await loadSettings();
  if (!s?.notify_atelier_applications || s.telegram_admin_chat_ids.length === 0) return;
  const { broadcastTelegram, escapeTelegramHtml } = await import("@/lib/telegram.server");
  const msg = [
    "<b>◈ Atelier application · GZAF</b>",
    "",
    `<b>Maison</b> ${escapeTelegramHtml(app.brand_name)}`,
    `<b>Contact</b> ${escapeTelegramHtml(app.contact_email)}`,
    app.city ? `<b>City</b> ${escapeTelegramHtml(app.city)}` : "",
  ].filter(Boolean).join("\n");
  await broadcastTelegram(s.telegram_admin_chat_ids, msg);
}
