// Server-only Instagram AI Sales Agent.
// Handles a single DM turn: loads history, runs AI with tools, sends reply,
// saves history. Tools cover: product lookup, order creation, admin escalation.

import { generateText, tool, stepCountIs } from "ai";
import { z } from "zod";
import { createLovableAI, DEFAULT_CHAT_MODEL } from "@/lib/ai-gateway.server";
import { products, type Product } from "@/lib/catalog";
import { sendInstagramMessage } from "@/lib/instagram.server";

type ChatMsg = { role: "user" | "assistant"; content: string; ts: string };

const SYSTEM_PROMPT = `أنت "زياد" — بائع محترف يشتغل في متجر GZAF (ماركة أزياء فاخرة مصرية، الدفع كاش عند الاستلام، الشحن داخل مصر بس، العملة جنيه مصري).

شخصيتك:
- بتتكلم عربي مصري راقي، دافي، وودود — زي بني آدم مش بوت.
- محترم، بتنادي العميل بأدب، ومبتضغطش عليه.
- بائع شاطر: بتفهم احتياجه، بتقترح المنتج المناسب، بتقنعه بذكاء، وبتقفل البيعة.
- ردودك قصيرة (سطر أو اتنين غالباً)، مفيهاش رسميات زيادة، وبتستخدم إيموجي بسيطة أحياناً (مش كتير).

قواعد صارمة:
1. متخترعش منتجات أو أسعار — استخدم أداة search_products دايماً قبل ما تقول سعر أو مقاس.
2. لما العميل يقولك عايز يشتري، اطلب منه البيانات دي واحدة واحدة (مش كلها مرة): الاسم بالكامل، رقم الموبايل، العنوان بالتفصيل (شارع/مدينة/محافظة)، الإيميل، المقاس. لما تجمعهم كلهم، استخدم create_order.
3. لو العميل زعلان، طلب حاجة معقدة (استرجاع، مقاس خاص، شكوى)، أو بيتكلم عن حاجة برة نطاقك — استخدم escalate_to_admin.
4. متقولش "أنا AI" أو "أنا بوت". لو سألك، قوله "أنا زياد من فريق GZAF 👋".
5. الشحن مجاني داخل مصر، والتسليم عادةً 2–5 أيام عمل. الدفع كاش عند الاستلام.

هدفك: تخلي العميل يحس إنه بيتكلم مع بائع شاطر يعرف منتجاته، ويقفل البيعة بأدب.`;

async function callSearchProducts(query: string): Promise<{ results: Array<{ slug: string; name: string; price_egp: number; category: string; sizes: string[]; description: string }> }> {
  const q = query.trim().toLowerCase();
  const matched: Product[] = q
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.slug.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      )
    : products;
  return {
    results: (matched.length ? matched : products).slice(0, 5).map((p) => ({
      slug: p.slug,
      name: p.name,
      price_egp: p.price,
      category: p.category,
      sizes: p.sizes,
      description: p.description.slice(0, 180),
    })),
  };
}

async function callCreateOrder(input: {
  slug: string;
  size: string;
  quantity: number;
  full_name: string;
  phone: string;
  email: string;
  address_line: string;
  city: string;
  notes?: string;
}, igUserId: string): Promise<{ ok: boolean; order_number?: string; total_egp?: number; error?: string }> {
  const product = products.find((p) => p.slug === input.slug);
  if (!product) return { ok: false, error: "product not found" };
  if (!product.sizes.includes(input.size)) return { ok: false, error: `size must be one of ${product.sizes.join(", ")}` };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const qty = Math.max(1, Math.min(20, Math.floor(input.quantity)));
  const subtotal = product.price * 100 * qty;

  const { data: dbProduct } = await supabaseAdmin
    .from("products")
    .select("id")
    .eq("slug", product.slug)
    .maybeSingle();

  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .insert({
      user_id: null,
      contact_email: input.email,
      contact_phone: input.phone,
      shipping_address: {
        full_name: input.full_name,
        line1: input.address_line,
        city: input.city,
        country: "Egypt",
        phone: input.phone,
      },
      subtotal_cents: subtotal,
      shipping_cents: 0,
      tax_cents: 0,
      total_cents: subtotal,
      status: "pending",
      notes: `[Instagram DM — ig:${igUserId}] ${input.notes ?? ""}`.trim(),
      payment_method: "cod",
    })
    .select("id, order_number, total_cents")
    .single();

  if (error || !order) return { ok: false, error: error?.message ?? "insert failed" };

  await supabaseAdmin.from("order_items").insert([
    {
      order_id: order.id,
      product_id: dbProduct?.id ?? null,
      product_snapshot: { slug: product.slug, name: product.name, image: "" },
      size: input.size,
      color: null,
      quantity: qty,
      unit_price_cents: product.price * 100,
    },
  ]);

  // Notify admin on Telegram (best-effort)
  try {
    const { notifyNewOrder } = await import("@/lib/notifications.functions");
    await notifyNewOrder({
      id: order.id,
      order_number: order.order_number,
      total_cents: order.total_cents,
      subtotal_cents: subtotal,
      shipping_cents: 0,
      contact_email: input.email,
      contact_phone: input.phone,
      shipping_address: {
        full_name: input.full_name,
        line1: input.address_line,
        city: input.city,
        country: "Egypt",
        phone: input.phone,
      },
      notes: `طلب من Instagram DM (المستخدم: ${igUserId})`,
      items: [{ name: product.name, size: input.size, color: null, quantity: qty }],
    });
  } catch (e) {
    console.error("IG order notify failed", e);
  }

  return { ok: true, order_number: order.order_number, total_egp: subtotal / 100 };
}

async function callEscalate(igUserId: string, username: string | null, reason: string, lastCustomerMessage: string): Promise<{ ok: boolean }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { broadcastTelegram } = await import("@/lib/telegram.server");
    const { data: settings } = await supabaseAdmin
      .from("notification_settings")
      .select("telegram_admin_chat_ids")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    const chatIds = (settings?.telegram_admin_chat_ids ?? []) as string[];
    if (!chatIds.length) return { ok: false };
    const msg = `🚨 <b>تصعيد من Instagram DM</b>\n\n<b>العميل:</b> ${username ? "@" + username : igUserId}\n<b>السبب:</b> ${reason}\n<b>آخر رسالة:</b> ${lastCustomerMessage}`;
    await broadcastTelegram(chatIds, msg);
    return { ok: true };
  } catch (e) {
    console.error("escalate failed", e);
    return { ok: false };
  }
}

export async function handleInstagramMessage(params: {
  igUserId: string;
  username: string | null;
  text: string;
}): Promise<void> {
  const { igUserId, username, text } = params;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Load or create conversation
  const { data: existing } = await supabaseAdmin
    .from("instagram_conversations")
    .select("id, messages")
    .eq("ig_user_id", igUserId)
    .maybeSingle();

  const rawHistory: ChatMsg[] = Array.isArray(existing?.messages)
    ? (existing!.messages as unknown as ChatMsg[])
    : [];
  // Cap history to last 20 turns to stay lean
  const history = rawHistory.slice(-20);
  history.push({ role: "user", content: text, ts: new Date().toISOString() });

  const ai = createLovableAI();
  let assistantReply = "لحظة معاك 🌹";

  try {
    const result = await generateText({
      model: ai(DEFAULT_CHAT_MODEL),
      system: SYSTEM_PROMPT,
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      stopWhen: stepCountIs(8),
      tools: {
        search_products: tool({
          description: "ابحث في كتالوج GZAF عن منتج بالاسم أو الفئة. استخدمها دايماً قبل ما تقول سعر أو مقاس.",
          inputSchema: z.object({
            query: z.string().describe("كلمة بحث أو اسم المنتج. سيبها فاضية لعرض كل المنتجات."),
          }),
          execute: async ({ query }) => callSearchProducts(query),
        }),
        create_order: tool({
          description: "أنشئ أوردر للعميل بعد جمع كل بياناته. استخدمها فقط لما تكون متأكد من كل حاجة.",
          inputSchema: z.object({
            slug: z.string().describe("slug المنتج من search_products"),
            size: z.string().describe("مقاس (M/L/XL)"),
            quantity: z.number().int().positive().default(1),
            full_name: z.string().min(2),
            phone: z.string().min(6),
            email: z.string().email(),
            address_line: z.string().min(4),
            city: z.string().min(2),
            notes: z.string().optional(),
          }),
          execute: async (input) => callCreateOrder(input, igUserId),
        }),
        escalate_to_admin: tool({
          description: "حوّل العميل للأدمن على تليجرام لما الموقف صعب (شكوى، استرجاع، طلب خاص، عميل زعلان، أو حاجة برة نطاقك).",
          inputSchema: z.object({
            reason: z.string().describe("سبب التصعيد باختصار"),
          }),
          execute: async ({ reason }) => callEscalate(igUserId, username, reason, text),
        }),
      },
    });
    assistantReply = result.text?.trim() || assistantReply;
  } catch (e) {
    console.error("IG AI generation failed", e);
    assistantReply = "معلش حصل خطأ بسيط، ممكن تعيد كلامك؟";
  }

  // Send DM back
  await sendInstagramMessage(igUserId, assistantReply);

  // Persist history
  history.push({ role: "assistant", content: assistantReply, ts: new Date().toISOString() });
  const payload = {
    ig_user_id: igUserId,
    username: username ?? existing?.["username" as never] ?? null,
    messages: history,
    last_message_at: new Date().toISOString(),
    status: "active",
  };
  await supabaseAdmin
    .from("instagram_conversations")
    .upsert(payload as never, { onConflict: "ig_user_id" });
}
