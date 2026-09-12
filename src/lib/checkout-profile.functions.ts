import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSavedCheckout = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: addr }, { data: user }] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("addresses")
          .select(
            "id, full_name, line1, line2, city, postal_code, country, phone",
          )
          .eq("user_id", userId)
          .order("is_default", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase.auth.getUser(),
      ]);

    const email = user?.user?.email ?? "";
    const full = (addr?.full_name || profile?.full_name || "").trim();
    const [first_name, ...rest] = full.split(/\s+/);

    return {
      email,
      phone: addr?.phone || profile?.phone || "",
      first_name: first_name || "",
      last_name: rest.join(" ") || "",
      line1: addr?.line1 || "",
      line2: addr?.line2 || "",
      city: addr?.city || "",
      postal_code: addr?.postal_code || "",
      country: addr?.country || "Egypt",
    };
  });

const saveSchema = z.object({
  phone: z.string().trim().max(40).optional(),
  full_name: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(120),
  postal_code: z.string().trim().max(30).optional().default("-"),
  country: z.string().trim().min(1).max(80),
});

export const saveCheckoutDetails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => saveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: data.full_name,
        phone: data.phone ?? null,
      },
      { onConflict: "id" },
    );

    const { data: existing } = await supabase
      .from("addresses")
      .select("id")
      .eq("user_id", userId)
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = {
      user_id: userId,
      full_name: data.full_name,
      line1: data.line1,
      line2: data.line2 ?? null,
      city: data.city,
      postal_code: data.postal_code,
      country: data.country,
      phone: data.phone ?? null,
      is_default: true,
    };

    if (existing?.id) {
      await supabase.from("addresses").update(payload).eq("id", existing.id);
    } else {
      await supabase.from("addresses").insert(payload);
    }

    return { ok: true };
  });
