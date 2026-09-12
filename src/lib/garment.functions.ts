import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, NoObjectGeneratedError, Output } from "ai";
import { z } from "zod";
import { createLovableAI, DEFAULT_CHAT_MODEL } from "@/lib/ai-gateway.server";

// ---------- Save a generation (persists PNG + row) ----------
const SaveInput = z.object({
  kind: z.enum(["try_on", "lookbook", "fabric", "fit_advice"]),
  prompt: z.string().min(1),
  productSlugs: z.array(z.string()).default([]),
  imageDataUrl: z.string().min(1).optional(),
  notes: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const saveGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => SaveInput.parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    let imageUrl: string | null = null;

    if (data.imageDataUrl) {
      const match = data.imageDataUrl.match(/^data:(image\/[a-z0-9+.-]+);base64,(.+)$/i);
      if (!match) throw new Error("Invalid image data");
      const [, mime, b64] = match;
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const ext = mime.split("/")[1] === "jpeg" ? "jpg" : mime.split("/")[1];
      const path = `${userId}/${data.kind}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("garment-ai")
        .upload(path, bytes, { contentType: mime, upsert: false });
      if (upErr) throw new Error(upErr.message);
      imageUrl = path;
    }

    const { data: row, error } = await supabase
      .from("garment_generations")
      .insert({
        user_id: userId,
        kind: data.kind,
        prompt: data.prompt,
        product_slugs: data.productSlugs,
        image_url: imageUrl,
        notes: data.notes ?? null,
        metadata: (data.metadata ?? {}) as never,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

// ---------- List user's gallery ----------
export const listGenerations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("garment_generations")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);

    const withSigned = await Promise.all(
      (data ?? []).map(async (row) => {
        if (!row.image_url) return { ...row, signed_url: null as string | null };
        const { data: signed } = await supabase.storage
          .from("garment-ai")
          .createSignedUrl(row.image_url, 3600);
        return { ...row, signed_url: signed?.signedUrl ?? null };
      }),
    );
    return withSigned;
  });

// ---------- Delete a generation ----------
export const deleteGeneration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => z.object({ id: z.string().uuid() }).parse(v))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row } = await supabase
      .from("garment_generations")
      .select("image_url")
      .eq("id", data.id)
      .eq("user_id", userId)
      .maybeSingle();
    if (row?.image_url) {
      await supabase.storage.from("garment-ai").remove([row.image_url]);
    }
    const { error } = await supabase
      .from("garment_generations")
      .delete()
      .eq("id", data.id)
      .eq("user_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- AI Lookbook: pick 3–4 products from a catalog list ----------
const CatalogProductSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  meta: z.string(),
});

const ComposeInput = z.object({
  brief: z.string().min(1),
  catalog: z.array(CatalogProductSchema),
});

export const composeOutfit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => ComposeInput.parse(v))
  .handler(async ({ data }) => {
    const provider = createLovableAI(true);
    const catalogText = data.catalog
      .map((p) => `- ${p.slug} | ${p.name} | ${p.category} | $${p.price} | ${p.meta}`)
      .join("\n");

    const schema = z.object({
      title: z.string(),
      story: z.string(),
      hero_prompt: z.string(),
      picks: z.array(z.object({
        slug: z.string(),
        role: z.string(),
        reason: z.string(),
      })),
    });

    try {
      const { output } = await generateText({
        model: provider(DEFAULT_CHAT_MODEL),
        output: Output.object({ schema }),
        prompt: `You are GZAF's creative director. Build one outfit from this catalog.

Brief: ${data.brief}

Available pieces:
${catalogText}

Rules:
- Pick 3 to 4 pieces (only slugs from the list above).
- "role" is the garment's function (e.g. "silhouette", "outerwear", "accent", "footwear").
- "title" is 2-4 words, editorial.
- "story" is 2 short sentences, luxury fashion prose.
- "hero_prompt" is a single dense sentence for a text-to-image model to render a full-body editorial photograph of a model wearing this outfit, on a matte black studio backdrop, cinematic lighting, sharp couture aesthetic.`,
      });
      // clamp picks to 4 in code, per schema-bounds rule
      const picks = output.picks
        .filter((p) => data.catalog.some((c) => c.slug === p.slug))
        .slice(0, 4);
      return { ...output, picks };
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("Could not compose an outfit. Try a more specific brief.");
      }
      throw error;
    }
  });

// ---------- Fit & Size Advisor: chat completion with structured recommendation ----------
const FitInput = z.object({
  productName: z.string(),
  productCategory: z.string(),
  sizes: z.array(z.string()),
  measurements: z.object({
    heightCm: z.number().nullable(),
    weightKg: z.number().nullable(),
    chestCm: z.number().nullable(),
    waistCm: z.number().nullable(),
    hipsCm: z.number().nullable(),
    usualSize: z.string().nullable(),
    fitPreference: z.enum(["fitted", "regular", "relaxed"]).nullable(),
  }),
  notes: z.string().optional(),
});

export const fitAdvice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v: unknown) => FitInput.parse(v))
  .handler(async ({ data }) => {
    const provider = createLovableAI(true);
    const schema = z.object({
      recommended_size: z.string(),
      confidence: z.enum(["low", "medium", "high"]),
      rationale: z.string(),
      fit_notes: z.array(z.string()),
      alteration_hints: z.array(z.string()),
    });

    try {
      const { output } = await generateText({
        model: provider(DEFAULT_CHAT_MODEL),
        output: Output.object({ schema }),
        prompt: `You are GZAF's atelier fit specialist. Recommend one size from this list only: ${data.sizes.join(", ")}.

Product: ${data.productName} (${data.productCategory})
Sizes offered: ${data.sizes.join(", ")}
Customer measurements:
- Height: ${data.measurements.heightCm ?? "n/a"} cm
- Weight: ${data.measurements.weightKg ?? "n/a"} kg
- Chest: ${data.measurements.chestCm ?? "n/a"} cm
- Waist: ${data.measurements.waistCm ?? "n/a"} cm
- Hips: ${data.measurements.hipsCm ?? "n/a"} cm
- Usual size: ${data.measurements.usualSize ?? "n/a"}
- Fit preference: ${data.measurements.fitPreference ?? "regular"}
- Additional notes: ${data.notes ?? "none"}

Rules:
- "recommended_size" MUST be exactly one string from the offered sizes list.
- "confidence" reflects how much data you have.
- "fit_notes": 2 to 4 short observations on how this piece will sit.
- "alteration_hints": 1 to 3 concrete tailoring tips (or an empty array if none).
- Keep everything concise and precise, no marketing fluff.`,
      });
      if (!data.sizes.includes(output.recommended_size)) {
        output.recommended_size = data.sizes[0];
        output.confidence = "low";
      }
      output.fit_notes = output.fit_notes.slice(0, 4);
      output.alteration_hints = output.alteration_hints.slice(0, 3);
      return output;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error)) {
        throw new Error("Could not compute fit advice. Add more measurements.");
      }
      throw error;
    }
  });
