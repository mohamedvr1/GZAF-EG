// Server-only Instagram Graph API helper.
import { createHmac, timingSafeEqual } from "crypto";

const GRAPH_URL = "https://graph.instagram.com/v21.0";

export function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signatureHeader) return false;
  const expected = "sha256=" + createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function sendInstagramMessage(recipientId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.IG_PAGE_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "IG_PAGE_ACCESS_TOKEN missing" };
  try {
    const res = await fetch(`${GRAPH_URL}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text },
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error(`Instagram send failed [${res.status}]: ${body}`);
      return { ok: false, error: `${res.status} ${body}` };
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Instagram send exception", msg);
    return { ok: false, error: msg };
  }
}

export async function markSeen(recipientId: string): Promise<void> {
  const token = process.env.IG_PAGE_ACCESS_TOKEN;
  if (!token) return;
  try {
    await fetch(`${GRAPH_URL}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "mark_seen" }),
    });
    await fetch(`${GRAPH_URL}/me/messages?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipient: { id: recipientId }, sender_action: "typing_on" }),
    });
  } catch {
    // best-effort
  }
}
