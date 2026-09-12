import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListApplications, adminUpdateApplication } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/applications")({
  component: ApplicationsPage,
});

const STATUSES = ["pending", "reviewing", "approved", "rejected"] as const;
const STATUS_LABELS: Record<typeof STATUSES[number], string> = {
  pending: "قيد الانتظار",
  reviewing: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

function ApplicationsPage() {
  const list = useServerFn(adminListApplications);
  const update = useServerFn(adminUpdateApplication);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-applications"],
    queryFn: () => list(),
  });
  const mut = useMutation({
    mutationFn: (i: any) => update({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-applications"] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-couture-red mb-3">05 · الموردون</p>
        <h1 className="font-display italic text-5xl">طلبات الموردين</h1>
      </div>

      {isLoading ? (
        <p className="eyebrow text-paper/50">جارٍ التحميل…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-paper/50 text-sm">لا توجد طلبات بعد.</p>
      ) : (
        <div className="space-y-4">
          {data.map((a: any) => (
            <div key={a.id} className="border border-white/10 p-6 space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-display italic text-2xl">{a.company_name}</p>
                  <p className="micro-label text-paper/40 mt-1">
                    {a.contact_name} · {a.country} · {new Date(a.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <select
                  value={a.status}
                  onChange={(e) =>
                    mut.mutate({ application_id: a.id, status: e.target.value })
                  }
                  className="bg-noir border border-white/20 px-3 py-2 text-xs tracking-[0.2em] focus:border-couture-red outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-paper/70">
                <div>البريد: {a.email}</div>
                <div>الهاتف: {a.phone ?? "—"}</div>
                <div>التخصص: {a.specialization ?? "—"}</div>
                <div>الأعمال: {a.portfolio_url ?? "—"}</div>
              </div>
              {a.message && (
                <p className="text-sm text-paper/60 italic border-r-2 border-couture-red pr-4">
                  "{a.message}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
