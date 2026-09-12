import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

function deriveTelegramWebhookSecret(telegramApiKey: string): string {
  return createHash("sha256").update(`telegram-webhook:${telegramApiKey}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

type CallbackQuery = {
  id: string;
  from?: { id: number; first_name?: string; username?: string };
  data?: string;
  message?: { message_id: number; chat: { id: number }; text?: string };
};

export const Route = createFileRoute("/api/public/telegram/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) return new Response("misconfigured", { status: 500 });

        const expected = deriveTelegramWebhookSecret(TELEGRAM_API_KEY);
        const actual = request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "";
        if (!safeEqual(actual, expected)) return new Response("Unauthorized", { status: 401 });

        const update = (await request.json()) as { callback_query?: CallbackQuery };
        const cb = update.callback_query;
        if (!cb?.data || !cb.message) return Response.json({ ok: true, ignored: true });

        const [action, orderId] = cb.data.split(":");
        if (!orderId || (action !== "approve" && action !== "reject")) {
          const { answerCallbackQuery } = await import("@/lib/telegram.server");
          await answerCallbackQuery(cb.id, "Unknown action");
          return Response.json({ ok: true });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { answerCallbackQuery } = await import("@/lib/telegram.server");

        // Verify the Telegram user is a whitelisted admin chat id
        const { data: settings } = await supabaseAdmin
          .from("notification_settings")
          .select("telegram_admin_chat_ids")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        const fromId = String(cb.from?.id ?? "");
        const chatId = String(cb.message.chat.id);
        const allowed = settings?.telegram_admin_chat_ids ?? [];
        if (!allowed.includes(fromId) && !allowed.includes(chatId)) {
          await answerCallbackQuery(cb.id, "غير مصرح");
          return Response.json({ ok: true });
        }

        const newStatus = action === "approve" ? "processing" : "cancelled";
        const { data: updated, error } = await supabaseAdmin
          .from("orders")
          .update({ status: newStatus })
          .eq("id", orderId)
          .select("order_number, status")
          .maybeSingle();

        if (error || !updated) {
          await answerCallbackQuery(cb.id, "فشل التحديث");
          return Response.json({ ok: false });
        }

        const who = cb.from?.username ? `@${cb.from.username}` : (cb.from?.first_name ?? "admin");
        const stampBtn = action === "approve"
          ? `✅ Approved by ${who}`
          : `❌ Rejected by ${who}`;

        const { editMessageReplyMarkup } = await import("@/lib/telegram.server");
        await editMessageReplyMarkup(cb.message.chat.id, cb.message.message_id, {
          inline_keyboard: [[{ text: stampBtn, callback_data: "noop" }]],
        });
        await answerCallbackQuery(cb.id, action === "approve" ? "تم قبول الطلب" : "تم رفض الطلب");

        return Response.json({ ok: true });
      },
    },
  },
});

