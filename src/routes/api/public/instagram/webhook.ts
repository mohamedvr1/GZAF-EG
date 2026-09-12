import { createFileRoute } from "@tanstack/react-router";

type IgMessagingEvent = {
  sender?: { id: string; username?: string };
  recipient?: { id: string };
  timestamp?: number;
  message?: {
    mid?: string;
    text?: string;
    is_echo?: boolean;
    is_deleted?: boolean;
  };
};

type IgWebhookPayload = {
  object?: string;
  entry?: Array<{
    id: string;
    time?: number;
    messaging?: IgMessagingEvent[];
  }>;
};

export const Route = createFileRoute("/api/public/instagram/webhook")({
  server: {
    handlers: {
      // Meta webhook verification (subscribe step)
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const mode = url.searchParams.get("hub.mode");
        const token = url.searchParams.get("hub.verify_token");
        const challenge = url.searchParams.get("hub.challenge");
        const expected = process.env.INSTAGRAM_VERIFY_TOKEN;
        if (mode === "subscribe" && token && expected && token === expected) {
          return new Response(challenge ?? "", { status: 200 });
        }
        return new Response("Forbidden", { status: 403 });
      },
      // Message delivery
      POST: async ({ request }) => {
        const rawBody = await request.text();
        const signature = request.headers.get("x-hub-signature-256");

        const { verifySignature } = await import("@/lib/instagram.server");
        if (!verifySignature(rawBody, signature)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: IgWebhookPayload;
        try {
          payload = JSON.parse(rawBody) as IgWebhookPayload;
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        // Acknowledge quickly; process asynchronously per Meta guidance.
        // In this Worker runtime we still await, but limit to first message only.
        const entries = payload.entry ?? [];
        const tasks: Array<Promise<void>> = [];
        for (const entry of entries) {
          for (const evt of entry.messaging ?? []) {
            if (evt.message?.is_echo || evt.message?.is_deleted) continue;
            const text = evt.message?.text?.trim();
            const senderId = evt.sender?.id;
            if (!text || !senderId) continue;

            tasks.push(
              (async () => {
                try {
                  const { markSeen } = await import("@/lib/instagram.server");
                  await markSeen(senderId);
                  const { handleInstagramMessage } = await import("@/lib/instagram-agent.server");
                  await handleInstagramMessage({
                    igUserId: senderId,
                    username: evt.sender?.username ?? null,
                    text,
                  });
                } catch (e) {
                  console.error("IG handler error", e);
                }
              })(),
            );
          }
        }

        // Best-effort: wait but do not fail the webhook if a handler throws.
        await Promise.allSettled(tasks);
        return new Response("EVENT_RECEIVED", { status: 200 });
      },
    },
  },
});
