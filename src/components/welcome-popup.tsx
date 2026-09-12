import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "gzaf_welcome_seen_v1";
const COUPON = "WELCOME20";

export function WelcomePopup() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const t = setTimeout(() => setOpen(true), 1500);
    return () => clearTimeout(t);
  }, []);

  function close() {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
      setError("من فضلك أدخل بريدًا إلكترونيًا صحيحًا");
      return;
    }
    setLoading(true);
    try {
      const { error: dbError } = await supabase
        .from("newsletter_subscribers")
        .insert({ email: trimmed, is_active: true, source: "welcome_popup" });
      // Ignore duplicate-email errors — still show the coupon
      if (dbError && !/duplicate|unique/i.test(dbError.message)) {
        throw dbError;
      }
      setDone(true);
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ، حاول مجددًا");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(COUPON);
    } catch {}
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-title"
    >
      <div className="relative w-full max-w-lg bg-noir border border-white/10 p-10 md:p-14 text-paper">
        <button
          onClick={close}
          aria-label="إغلاق"
          className="absolute top-4 right-4 text-paper/50 hover:text-couture-red text-sm tracking-[0.3em]"
        >
          ✕
        </button>

        {!done ? (
          <>
            <span className="text-couture-red text-[10px] font-bold tracking-[0.4em] block mb-6">
              MAISON GZAF
            </span>
            <h2
              id="welcome-title"
              className="font-display italic text-3xl md:text-5xl leading-[1.05] mb-4"
            >
              20% OFF <br />
              on your first order
            </h2>
            <p className="text-paper/60 text-sm leading-loose mb-8">
              اشترك في نشرتنا الخاصة واستقبل كودك الترحيبي فورًا، بالإضافة إلى
              الدعوات الحصرية للعروض الجديدة.
            </p>

            <form onSubmit={submit} className="flex flex-col gap-4">
              <label htmlFor="welcome-email" className="sr-only">
                البريد الإلكتروني
              </label>
              <input
                id="welcome-email"
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="EMAIL ADDRESS"
                className="w-full bg-transparent border-b border-paper/20 pb-3 text-[12px] tracking-[0.25em] focus:outline-none focus:border-couture-red transition-colors placeholder:text-paper/25"
              />
              {error && (
                <p className="text-couture-red text-xs tracking-wider">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-4 bg-couture-red text-paper py-4 text-[11px] font-bold tracking-[0.4em] uppercase hover:bg-couture-red-deep transition-colors disabled:opacity-50"
              >
                {loading ? "جارٍ..." : "اشترك واحصل على 20%"}
              </button>
              <button
                type="button"
                onClick={close}
                className="text-paper/40 text-[10px] tracking-[0.3em] uppercase hover:text-paper/70 transition-colors"
              >
                لا شكرًا
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="text-couture-red text-[10px] font-bold tracking-[0.4em] block mb-6">
              WELCOME TO GZAF
            </span>
            <h2 className="font-display italic text-3xl md:text-5xl leading-[1.05] mb-6">
              كودك جاهز
            </h2>
            <p className="text-paper/60 text-sm leading-loose mb-6">
              استخدم الكود التالي عند إتمام الطلب للحصول على خصم 20%:
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
                onClick={close}
                className="flex-1 bg-couture-red text-paper py-3 text-[11px] font-bold tracking-[0.3em] uppercase hover:bg-couture-red-deep transition-colors"
              >
                تسوّق الآن
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
