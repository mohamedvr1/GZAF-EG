import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, tool, stepCountIs, type UIMessage } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { createLovableAI, DEFAULT_CHAT_MODEL } from "@/lib/ai-gateway.server";

const SYSTEM_PROMPT = `You are the GZAF Style Concierge — a discreet, erudite personal shopper for a luxury fashion house.

Voice: editorial, warm, restrained. Speak like a couture atelier host. Use short paragraphs. Avoid emoji.

Capabilities:
- Advise on styling, occasion dressing, and wardrobe curation for GZAF collections.
- Use the searchCatalog tool to look up real products by keyword, category, or price. Never invent products, prices, or slugs.
- When recommending pieces, always cite the exact product name and mention the price in EGP (Egyptian Pounds).
- Politely decline anything outside fashion, styling, and the GZAF experience.

Format prices as $X,XXX. Keep replies under 6 sentences unless the guest asks for depth.`;

function serviceClient() {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const auth = request.headers.get("authorization");
          const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
          if (!token) return new Response("Unauthorized", { status: 401 });

          const admin = serviceClient();
          const { data: userData, error: userErr } = await admin.auth.getUser(token);
          if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });
          const userId = userData.user.id;

          const body = (await request.json()) as {
            messages: UIMessage[];
            threadId?: string;
          };
          const messages = body.messages ?? [];
          let threadId = body.threadId;

          // Verify or create thread
          if (threadId) {
            const { data: t } = await admin
              .from("chat_threads")
              .select("id, user_id")
              .eq("id", threadId)
              .maybeSingle();
            if (!t || t.user_id !== userId) return new Response("Forbidden", { status: 403 });
          } else {
            const { data: t, error } = await admin
              .from("chat_threads")
              .insert({ user_id: userId, title: "New conversation" })
              .select("id")
              .single();
            if (error || !t) return new Response("Cannot create thread", { status: 500 });
            threadId = t.id;
          }

          // Persist the newest user message (last message).
          const last = messages[messages.length - 1];
          if (last?.role === "user") {
            await admin.from("chat_messages").insert({
              thread_id: threadId,
              user_id: userId,
              role: "user",
              parts: last.parts as never,
            });

            // Auto-title from first user message
            const { count } = await admin
              .from("chat_messages")
              .select("id", { count: "exact", head: true })
              .eq("thread_id", threadId);
            if ((count ?? 0) <= 1) {
              const text = last.parts
                .map((p) => (p.type === "text" ? p.text : ""))
                .join(" ")
                .trim()
                .slice(0, 60);
              if (text) await admin.from("chat_threads").update({ title: text }).eq("id", threadId);
            }
          }

          const ai = createLovableAI();
          const searchCatalog = tool({
            description:
              "Search the GZAF product catalog. Returns matching products with name, category, price, slug, and short description.",
            inputSchema: z.object({
              query: z.string().describe("Free-text search: fabric, mood, occasion, name."),
              category: z.enum(["Women", "Men", "Accessories", "Footwear"]).nullable(),
              maxPriceUsd: z.number().nullable(),
              limit: z.number().int().min(1).max(8).default(4),
            }),
            execute: async ({ query, category, maxPriceUsd, limit }) => {
              let q = admin
                .from("products")
                .select("slug, name, description, price_cents, categories(name)")
                .eq("is_active", true)
                .limit(limit);
              if (category) {
                const { data: cat } = await admin
                  .from("categories")
                  .select("id")
                  .eq("name", category)
                  .maybeSingle();
                if (cat) q = q.eq("category_id", cat.id);
              }
              if (maxPriceUsd) q = q.lte("price_cents", Math.floor(maxPriceUsd * 100));
              if (query) q = q.ilike("name", `%${query}%`);
              const { data } = await q;
              return (data ?? []).map((p) => ({
                slug: p.slug,
                name: p.name,
                category: (p.categories as { name: string } | null)?.name ?? null,
                price_usd: (p.price_cents ?? 0) / 100,
                description: p.description ?? "",
              }));
            },
          });

          const result = streamText({
            model: ai(DEFAULT_CHAT_MODEL),
            system: SYSTEM_PROMPT,
            messages: await convertToModelMessages(messages),
            tools: { searchCatalog },
            stopWhen: stepCountIs(50),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: messages,
            onFinish: async ({ responseMessage }) => {
              await admin.from("chat_messages").insert({
                thread_id: threadId!,
                user_id: userId,
                role: "assistant",
                parts: responseMessage.parts as never,
              });
              await admin
                .from("chat_threads")
                .update({ updated_at: new Date().toISOString() })
                .eq("id", threadId!);
            },
            headers: { "x-thread-id": threadId },
          });
        } catch (err) {
          console.error("[/api/chat]", err);
          return new Response("Server error", { status: 500 });
        }
      },
    },
  },
});
