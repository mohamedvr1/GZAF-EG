import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListSubscribers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/newsletter")({
  component: NewsletterPage,
});

function NewsletterPage() {
  const list = useServerFn(adminListSubscribers);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-newsletter"],
    queryFn: () => list(),
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = [["email", "source", "is_active", "created_at"]];
    for (const s of data as any[]) {
      rows.push([s.email, s.source ?? "", String(s.is_active), s.created_at]);
    }
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gzaf-newsletter-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <p className="eyebrow text-couture-red mb-3">07 · النشرة البريدية</p>
          <h1 className="font-display italic text-5xl">المشتركون</h1>
        </div>
        <button
          onClick={exportCsv}
          className="eyebrow px-5 py-2 border border-white/20 hover:border-couture-red hover:text-couture-red transition-colors"
        >
          تصدير CSV
        </button>
      </div>

      {isLoading ? (
        <p className="eyebrow text-paper/50">جارٍ التحميل…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-paper/50 text-sm">لا يوجد مشتركون بعد.</p>
      ) : (
        <div className="border border-white/10 divide-y divide-white/10">
          {data.map((s: any) => (
            <div key={s.id} className="grid grid-cols-12 gap-4 p-4 items-center text-sm">
              <div className="col-span-6 text-paper/80">{s.email}</div>
              <div className="col-span-3 text-paper/40 micro-label">{s.source ?? "—"}</div>
              <div className="col-span-3 text-left micro-label text-paper/40">
                {new Date(s.created_at).toLocaleDateString("ar-EG")}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
