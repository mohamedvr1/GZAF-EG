import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TARGET = 10;

function generatePassword(): string {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return "GZAF-" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function countItems(userId: string): Promise<number> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Sum quantity across all non-cancelled orders for this user.
  const { data: orders, error: oErr } = await supabaseAdmin
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .neq("status", "cancelled");
  if (oErr) throw oErr;
  const ids = (orders ?? []).map((o) => o.id);
  if (ids.length === 0) return 0;
  const { data: items, error: iErr } = await supabaseAdmin
    .from("order_items")
    .select("quantity")
    .in("order_id", ids);
  if (iErr) throw iErr;
  return (items ?? []).reduce((s, r: any) => s + (r.quantity ?? 0), 0);
}

async function ensureUnlock(userId: string, contactEmail: string | null) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prof } = await supabaseAdmin
    .from("profiles")
    .select("limited_password, limited_granted_at, full_name")
    .eq("id", userId)
    .maybeSingle();

  if (prof?.limited_password) {
    return { password: prof.limited_password as string, grantedAt: prof.limited_granted_at as string | null };
  }
  const password = generatePassword();
  const grantedAt = new Date().toISOString();
  await supabaseAdmin
    .from("profiles")
    .update({ limited_password: password, limited_granted_at: grantedAt })
    .eq("id", userId);

  // Notify admin via Telegram (email delivery to Gmail requires an email domain
  // to be configured — until then the password is revealed to the user on-page).
  try {
    const { broadcastTelegram, escapeTelegramHtml } = await import("@/lib/telegram.server");
    const { data: settings } = await supabaseAdmin
      .from("notification_settings")
      .select("telegram_chat_id, event_type, enabled");
    const chatIds = (settings ?? [])
      .filter((s: any) => s.enabled && (s.event_type === "order_created" || s.event_type === "all"))
      .map((s: any) => s.telegram_chat_id as string);
    if (chatIds.length > 0) {
      const msg =
        `🔓 <b>Limited unlocked</b>\n` +
        `Customer: ${escapeTelegramHtml(contactEmail ?? userId)}\n` +
        `Password: <code>${escapeTelegramHtml(password)}</code>`;
      await broadcastTelegram(chatIds, msg);
    }
  } catch (e) {
    console.error("[limited] telegram notify failed", e);
  }
  return { password, grantedAt };
}

export const getLimitedStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    const email = (context.claims as any)?.email ?? null;
    // If a passphrase has already been issued (auto at 10, or manually by admin),
    // treat the account as unlocked regardless of current count.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("limited_password, limited_granted_at")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.limited_password) {
      return {
        count: TARGET,
        target: TARGET,
        unlocked: true as const,
        password: prof.limited_password as string,
        grantedAt: prof.limited_granted_at as string | null,
      };
    }
    const count = await countItems(userId);
    if (count >= TARGET) {
      const { password, grantedAt } = await ensureUnlock(userId, email);
      return { count, target: TARGET, unlocked: true as const, password, grantedAt };
    }
    return { count, target: TARGET, unlocked: false as const };
  });

export const verifyLimitedPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { password: string }) => d)
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("limited_password")
      .eq("id", context.userId)
      .maybeSingle();
    const ok =
      !!prof?.limited_password &&
      prof.limited_password.trim().toUpperCase() === data.password.trim().toUpperCase();
    return { ok };
  });
