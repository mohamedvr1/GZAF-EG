import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { emailOnlyPrepareSignIn } from "@/lib/email-only-auth.functions";

const COUPON = "WELCOME20";

const searchSchema = z.object({
  next: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — GZAF" },
      {
        name: "description",
        content: "Enter your email to access your GZAF salon.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Stage = "form" | "welcome";

function AuthPage() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("form");
  const [isNewUser, setIsNewUser] = useState(false);
  const grantedRef = useRef(false);

  const safeNext = (() => {
    if (!next || typeof next !== "string") return "/account";
    if (!next.startsWith("/") || next.startsWith("//")) return "/account";
    return next;
  })();

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      if (data.user) navigate({ to: safeNext, replace: true });
    });
    return () => {
      mounted = false;
    };
  }, [navigate, safeNext]);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(COUPON);
    } catch {}
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
      setError("من فضلك أدخل بريدًا إلكترونيًا صحيحًا");
      return;
    }
    setSubmitting(true);
    try {
      let password = "default_password";
      let showWelcomeCoupon = true;
      try {
        const prep = await emailOnlyPrepareSignIn({
          data: { email: trimmed },
        });
        password = prep.password;
        showWelcomeCoupon = prep.showWelcomeCoupon;
      } catch (prepErr) {
        console.warn("Prepare sign-in fallback:", prepErr);
      }

      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (signInErr) throw signInErr;

      if (showWelcomeCoupon && !grantedRef.current) {
        grantedRef.current = true;
        try {
          await supabase
            .from("newsletter_subscribers")
            .insert({ email: trimmed, is_active: true, source: "email_only_signin" });
        } catch {}
      }

      setIsNewUser(showWelcomeCoupon);
      if (showWelcomeCoupon) {
        setStage("welcome");
      } else {
        navigate({ to: safeNext, replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-noir text-paper font-sans flex flex-col">
      <div className="bg-black text-paper/70 text-[10px] tracking-[0.25em] py-2.5 px-6 uppercase font-medium border-b border-white/5">
        <Link to="/" className="hover:text-couture-red transition-colors">
          ← Return to GZAF
        </Link>
      </div>

      <section className="flex-1 grid grid-cols-1 lg:grid-cols-2">
        {/* Editorial pane */}
        <div className="hidden lg:flex relative bg-black border-r border-white/5 items-end p-16">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 bg-couture-red" />
              <span className="text-[10px] uppercase tracking-[0.4em] text-couture-red font-medium">
                L'Espace Privé
              </span>
            </div>
            <h1 className="font-display italic text-6xl xl:text-7xl leading-[0.95] mb-6">
              Your Salon<br />at GZAF.
            </h1>
            <p className="text-paper/55 text-sm leading-relaxed max-w-md tracking-wide">
              Enter your email to access your salon and unlock 20% off your
              first order.
            </p>
          </div>
        </div>

        {/* Form pane */}
        <div className="flex items-center justify-center px-6 md:px-16 py-16">
          <div className="w-full max-w-md">
            <div className="font-display text-3xl tracking-[0.35em] text-paper mb-10 text-center">
              GZAF
            </div>

            {stage === "form" && (
              <>
                <span className="text-couture-red text-[10px] font-bold tracking-[0.4em] block mb-4 text-center">
                  MAISON GZAF
                </span>
                <h2 className="font-display italic text-3xl md:text-4xl leading-[1.05] mb-3 text-center">
                  الدخول ببريدك<br />الإلكتروني
                </h2>
                <p className="text-paper/55 text-xs leading-loose mb-8 text-center">
                  أدخل بريدك الإلكتروني وادخل مباشرة — بدون كلمة مرور وبدون كود.
                </p>

                <form onSubmit={onSubmit} className="space-y-5">
                  <label className="block">
                    <span className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-2 block">
                      Email <span className="text-couture-red ml-1">*</span>
                    </span>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      dir="ltr"
                      className="w-full bg-transparent border-b border-white/20 focus:border-couture-red outline-none py-3 text-sm text-paper transition-colors"
                    />
                  </label>

                  {error && (
                    <p className="text-[11px] tracking-wide text-couture-red">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-couture-red text-paper py-4 text-[11px] uppercase tracking-[0.3em] font-semibold hover:bg-couture-red-deep transition-colors disabled:opacity-50"
                  >
                    {submitting ? "…" : "دخول"}
                  </button>
                </form>

                <p className="mt-10 text-[10px] uppercase tracking-[0.3em] text-paper/40 text-center">
                  By continuing you agree to our terms & privacy correspondence.
                </p>
              </>
            )}

            {stage === "welcome" && isNewUser && (
              <>
                <span className="text-couture-red text-[10px] font-bold tracking-[0.4em] block mb-4 text-center">
                  WELCOME TO GZAF
                </span>
                <h2 className="font-display italic text-3xl md:text-4xl leading-[1.05] mb-6 text-center">
                  أهلاً بك — كودك جاهز
                </h2>
                <p className="text-paper/60 text-sm leading-loose mb-6 text-center">
                  استخدم الكود التالي عند إتمام الطلب للحصول على خصم 20%.
                </p>
                <div className="border border-couture-red bg-couture-red/5 py-6 text-center mb-6">
                  <div className="font-display text-4xl tracking-[0.4em] text-couture-red">
                    {COUPON}
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={copyCode}
                    className="flex-1 border border-paper/20 py-3 text-[11px] tracking-[0.3em] uppercase hover:border-couture-red hover:text-couture-red transition-colors"
                  >
                    نسخ الكود
                  </button>
                  <button
                    onClick={() => navigate({ to: safeNext, replace: true })}
                    className="flex-1 bg-couture-red text-paper py-3 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-couture-red-deep transition-colors text-center"
                  >
                    متابعة
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
