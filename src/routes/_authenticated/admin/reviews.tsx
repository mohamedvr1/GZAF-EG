import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListReviews, adminToggleReview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const list = useServerFn(adminListReviews);
  const toggle = useServerFn(adminToggleReview);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reviews"],
    queryFn: () => list(),
  });
  const mut = useMutation({
    mutationFn: (i: { review_id: string; is_published: boolean }) => toggle({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-reviews"] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-couture-red mb-3">06 · التقييمات</p>
        <h1 className="font-display italic text-5xl">مراجعة التقييمات</h1>
      </div>

      {isLoading ? (
        <p className="eyebrow text-paper/50">جارٍ التحميل…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-paper/50 text-sm">لا توجد تقييمات بعد.</p>
      ) : (
        <div className="space-y-4">
          {data.map((r: any) => (
            <div key={r.id} className="border border-white/10 p-6 space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="eyebrow text-couture-red">{"★".repeat(r.rating)}</p>
                  <p className="font-display italic text-2xl mt-1">{r.title ?? "—"}</p>
                  <p className="micro-label text-paper/40 mt-1">
                    {r.products?.name ?? "?"} · {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    {r.is_verified_purchase && " · شراء موثّق"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    mut.mutate({ review_id: r.id, is_published: !r.is_published })
                  }
                  className={`eyebrow px-3 py-1.5 border ${
                    r.is_published
                      ? "border-couture-red text-couture-red"
                      : "border-white/20 text-paper/40"
                  }`}
                >
                  {r.is_published ? "منشور" : "مخفي"}
                </button>
              </div>
              {r.body && <p className="text-sm text-paper/70 leading-relaxed">{r.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
