import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const inputSchema = z.object({
  email: z.string().email().max(255).transform((v) => v.trim().toLowerCase()),
});

/**
 * Passwordless email-only sign-in.
 *
 * Ensures a user exists for the given email (creating one if needed) with
 * email already confirmed, then rotates their password to a fresh random
 * value and returns that value so the client can immediately call
 * signInWithPassword. The returned "password" is a one-time throwaway —
 * every sign-in rotates it.
 */
export const emailOnlyPrepareSignIn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fresh random password every sign-in — never persisted client-side.
    const password = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "").slice(0, 64);

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

      if (!process.env.SUPABASE_URL || process.env.SUPABASE_URL.includes("placeholder")) {
        return { password, showWelcomeCoupon: true };
      }

      // Find existing user by email (paginate — listUsers has a page size cap).
      let existingId: string | null = null;
      let page = 1;
      for (;;) {
        const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: 200,
        });
        if (error) throw error;
        const hit = list.users.find(
          (u) => (u.email ?? "").toLowerCase() === data.email,
        );
        if (hit) {
          existingId = hit.id;
          break;
        }
        if (list.users.length < 200) break;
        page += 1;
        if (page > 50) break; // hard stop
      }

      let userId: string;
      if (existingId) {
        userId = existingId;
        const { error } = await supabaseAdmin.auth.admin.updateUserById(existingId, {
          password,
          email_confirm: true,
        });
        if (error) throw error;
      } else {
        const { data: createdUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password,
          email_confirm: true,
        });
        if (error) throw error;
        userId = createdUser.user!.id;
      }

      // Atomically claim the one-time welcome coupon grant.
      const { data: granted } = await supabaseAdmin
        .from("profiles")
        .update({ welcome_coupon_granted_at: new Date().toISOString() })
        .eq("id", userId)
        .is("welcome_coupon_granted_at", null)
        .select("id")
        .maybeSingle();

      return { password, showWelcomeCoupon: !!granted };
    } catch (err) {
      console.warn("emailOnlyPrepareSignIn fallback active:", err);
      return { password, showWelcomeCoupon: true };
    }
  });
