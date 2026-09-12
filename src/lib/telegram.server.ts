// Server-only Telegram helper. Do NOT import from client code.
const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export type TelegramInlineButton =
  | { text: string; url: string }
  | { text: string; callback_data: string };
export type TelegramInlineKeyboard = TelegramInlineButton[][];

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  replyMarkup?: { inline_keyboard: TelegramInlineKeyboard },
): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const telegramKey = process.env.TELEGRAM_API_KEY;
  if (!lovableKey) return { ok: false, error: "LOVABLE_API_KEY missing" };
  if (!telegramKey) return { ok: false, error: "TELEGRAM_API_KEY missing" };

  try {
    const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": telegramKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Telegram sendMessage failed [${res.status}]: ${body}`);
      return { ok: false, error: `${res.status} ${body}` };
    }
    const json = (await res.json()) as { ok?: boolean; description?: string };
    if (!json.ok) return { ok: false, error: json.description ?? "Unknown Telegram error" };
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Telegram send exception", msg);
    return { ok: false, error: msg };
  }
}

export async function broadcastTelegram(
  chatIds: string[],
  text: string,
  replyMarkup?: { inline_keyboard: TelegramInlineKeyboard },
): Promise<void> {
  await Promise.all(chatIds.map((id) => sendTelegramMessage(id.trim(), text, replyMarkup)));
}

async function telegramCall(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; error?: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const telegramKey = process.env.TELEGRAM_API_KEY;
  if (!lovableKey || !telegramKey) return { ok: false, error: "keys missing" };
  try {
    const res = await fetch(`${GATEWAY_URL}/${method}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": telegramKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      console.error(`Telegram ${method} failed [${res.status}]: ${t}`);
      return { ok: false, error: `${res.status} ${t}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function answerCallbackQuery(callbackQueryId: string, text?: string) {
  return telegramCall("answerCallbackQuery", { callback_query_id: callbackQueryId, text, show_alert: false });
}

export async function editMessageReplyMarkup(chatId: number | string, messageId: number, replyMarkup: { inline_keyboard: TelegramInlineKeyboard }) {
  return telegramCall("editMessageReplyMarkup", { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup });
}

export async function editMessageText(chatId: number | string, messageId: number, text: string, replyMarkup?: { inline_keyboard: TelegramInlineKeyboard }) {
  return telegramCall("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
    ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
  });
}

export { escapeHtml as escapeTelegramHtml };

