import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { trackOrder } from "@/lib/orders.functions";

const searchSchema = z.object({
  order: z.string().optional(),
  phone: z.string().optional(),
});

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [
      { title: "تتبع الطلب — GZAF" },
      {
        name: "description",
        content:
          "تتبع حالة طلبك في GZAF عبر رقم الطلب ورقم الهاتف — بدون الحاجة لتسجيل الدخول.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  validateSearch: (input) => searchSchema.parse(input),
  component: TrackPage,
});

type TrackResult = Awaited<ReturnType<typeof trackOrder>>;

function TrackPage() {
  const { order = "", phone = "" } = Route.useSearch();
  const submit = useServerFn(trackOrder);

  const [orderNumber, setOrderNumber] = useState(order);
  const [phoneNum, setPhoneNum] = useState(phone);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TrackResult | null>(null);

  const runLookup = async (o: string, p: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await submit({ data: { order_number: o, phone: p } });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر تحميل الطلب.");
    } finally {
      setLoading(false);
    }
  };

  // Prefill from last-placed guest order if URL is empty.
  useEffect(() => {
    if (order || phone) {
      if (order && phone) runLookup(order, phone);
      return;
    }
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem("gzaf.last_order");
      if (!raw) return;
      const last = JSON.parse(raw) as { order_number?: string; phone?: string };
      if (last.order_number) setOrderNumber(last.order_number);
      if (last.phone) setPhoneNum(last.phone);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phoneNum.trim()) {
      setError("أدخل رقم الطلب ورقم الهاتف.");
      return;
    }
    runLookup(orderNumber.trim(), phoneNum.trim());
  };

  return (
    <div className="min-h-screen bg-noir text-paper font-sans flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-[720px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-couture-red" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red font-medium">
              تتبع الطلب
            </span>
          </div>
          <h1 className="font-display text-4xl md:text-6xl italic mb-10">
            أين طلبك؟
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6 mb-12">
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-2 block">
                رقم الطلب
              </span>
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="GZ-2026-XXXX"
                className="w-full bg-transparent border-b border-white/20 focus:border-couture-red outline-none py-3 text-sm text-paper transition-colors"
              />
            </label>
            <label className="block">
              <span className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-2 block">
                رقم الهاتف
              </span>
              <input
                value={phoneNum}
                onChange={(e) => setPhoneNum(e.target.value)}
                inputMode="tel"
                className="w-full bg-transparent border-b border-white/20 focus:border-couture-red outline-none py-3 text-sm text-paper transition-colors"
              />
            </label>

            {error && (
              <p className="text-[12px] text-couture-red">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-couture-red text-paper py-4 text-[11px] uppercase tracking-[0.3em] font-semibold hover:bg-couture-red-deep transition-colors disabled:opacity-50"
            >
              {loading ? "جارٍ البحث…" : "تتبع الطلب"}
            </button>
          </form>

          {result && (
            <div className="border border-white/10 bg-black/40 p-8">
              <div className="flex items-baseline justify-between mb-6">
                <p className="font-display italic text-2xl">
                  #{result.order_number}
                </p>
                <span className="text-[10px] uppercase tracking-[0.3em] text-couture-red">
                  {statusLabel(result.status)}
                </span>
              </div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-paper/50 mb-1">
                تاريخ الطلب
              </p>
              <p className="text-sm text-paper/85 mb-6">
                {new Date(result.created_at).toLocaleString("ar-EG")}
              </p>

              <div className="h-px bg-white/10 my-4" />

              <div className="space-y-4">
                {result.order_items.map((it, idx) => {
                  const snap = it.product_snapshot as {
                    name?: string;
                    image?: string;
                  } | null;
                  return (
                    <div key={idx} className="flex gap-4 text-sm">
                      {snap?.image && (
                        <div className="size-16 bg-black overflow-hidden shrink-0">
                          <img
                            src={snap.image}
                            alt={snap.name ?? ""}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-display italic text-base truncate">
                          {snap?.name}
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-paper/50 mt-1">
                          {it.size ? `${it.size} · ` : ""}Qty {it.quantity}
                        </p>
                      </div>
                      <p className="text-sm text-paper/80">
                        {((it.unit_price_cents * it.quantity) / 100).toLocaleString()} EGP
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="h-px bg-white/10 my-6" />

              <div className="flex justify-between items-baseline">
                <span className="text-[11px] uppercase tracking-[0.3em]">
                  الإجمالي
                </span>
                <span className="font-display text-3xl">
                  {(result.total_cents / 100).toLocaleString()} EGP
                </span>
              </div>
            </div>
          )}

          <p className="mt-10 text-[11px] text-paper/40 text-center">
            <Link to="/shop" className="border-b border-white/20 hover:border-couture-red pb-0.5">
              العودة للمتجر
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    pending: "قيد المراجعة",
    confirmed: "تم التأكيد",
    processing: "قيد التجهيز",
    shipped: "في الطريق إليك",
    delivered: "تم التوصيل",
    cancelled: "ملغى",
    refunded: "مسترجع",
  };
  return map[status] ?? status;
}
