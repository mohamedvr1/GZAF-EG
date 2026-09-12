import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminStats } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: OverviewPage,
});

function formatCents(c: number) {
  return `${(c / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })} EGP`;
}

function OverviewPage() {
  const fn = useServerFn(getAdminStats);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => fn(),
  });

  if (isLoading || !data) {
    return <div className="eyebrow text-paper/50">جارٍ تحميل البيانات…</div>;
  }

  const cards = [
    { label: "الإيرادات", value: formatCents(data.revenueCents) },
    { label: "الطلبات", value: data.ordersCount },
    { label: "المنتجات", value: data.productsCount },
    { label: "طلبات موردين قيد المراجعة", value: data.pendingApplications },
    { label: "مشتركو النشرة", value: data.newsletterCount },
    { label: "التقييمات", value: data.reviewsCount },
  ];

  return (
    <div className="space-y-12">
      <div>
        <p className="eyebrow text-couture-red mb-3">01 · نظرة عامة</p>
        <h1 className="font-display italic text-5xl md:text-6xl">لوحة القيادة</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-white/10 border border-white/10">
        {cards.map((c) => (
          <div key={c.label} className="bg-noir p-8">
            <p className="micro-label text-paper/40 mb-4">{c.label}</p>
            <p className="font-display italic text-4xl">{c.value}</p>
          </div>
        ))}
      </div>

      <section>
        <p className="eyebrow text-couture-red mb-4">02 · أحدث الطلبات</p>
        {data.recentOrders.length === 0 ? (
          <p className="text-paper/50 text-sm">لا توجد طلبات بعد.</p>
        ) : (
          <div className="border border-white/10 divide-y divide-white/10">
            {data.recentOrders.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between p-5">
                <div>
                  <p className="font-display italic text-xl">{formatCents(o.total_cents)}</p>
                  <p className="micro-label text-paper/40">
                    {new Date(o.created_at).toLocaleString("ar-EG")}
                  </p>
                </div>
                <span className="eyebrow text-couture-red">{o.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
