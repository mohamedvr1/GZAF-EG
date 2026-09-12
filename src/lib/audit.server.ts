// Server-only audit log helper. Never import from client code.
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

export type AuditEntry = {
  actorId: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function logAuditEvent(entry: AuditEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let ip: string | null = null;
    let ua: string | null = null;
    try {
      ip = getRequestIP({ xForwardedFor: true }) ?? null;
      ua = getRequestHeader("user-agent") ?? null;
    } catch {
      // Not inside a request context — ignore.
    }
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: (entry.metadata ?? {}) as never,
      ip_address: ip,
      user_agent: ua,
    });
  } catch (err) {
    // Never let audit failure break the caller's action.
    console.error("[audit] failed to record event", err);
  }
}
