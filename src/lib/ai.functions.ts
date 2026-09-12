import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { createLovableAI, DEFAULT_CHAT_MODEL } from "@/lib/ai-gateway.server";

const SearchSchema = z.object({
  query: z.string().min(1).max(200),
});

const SearchOutput = z.object({
  category: z.string().nullable(),
  maxPriceUsd: z.number().nullable(),
  minPriceUsd: z.number().nullable(),
  keywords: z.array(z.string()),
  intent: z.string(),
});

export const smartSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SearchSchema.parse(d))
  .handler(async ({ data }) => {
    const ai = createLovableAI(true);
    try {
      const { output } = await generateText({
        model: ai(DEFAULT_CHAT_MODEL),
        output: Output.object({ schema: SearchOutput }),
        prompt: `Parse this shopper query into structured filters for a luxury fashion catalog. Categories available: Women, Men, Accessories, Footwear. Extract price hints (assume USD). If unknown, use null. Query: "${data.query}"`,
      });
      return output;
    } catch (err) {
      if (NoObjectGeneratedError.isInstance(err)) {
        return { category: null, maxPriceUsd: null, minPriceUsd: null, keywords: [data.query], intent: data.query };
      }
      throw err;
    }
  });

export const generateProductDescription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        name: z.string().min(1),
        category: z.string().nullable(),
        priceUsd: z.number().nullable(),
        notes: z.string().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const ai = createLovableAI();
    const { text } = await generateText({
      model: ai(DEFAULT_CHAT_MODEL),
      system:
        "You are the copy director for GZAF, a luxury fashion house. Write editorial product descriptions: evocative, restrained, 2–3 short paragraphs, no emoji, no hype. Reference fabric, silhouette, and occasion when possible.",
      prompt: `Write a description for:
Product: ${data.name}
Category: ${data.category ?? "Unspecified"}
Price: ${data.priceUsd ? `$${data.priceUsd.toFixed(0)}` : "n/a"}
Notes: ${data.notes ?? "none"}`,
    });
    return { description: text.trim() };
  });
