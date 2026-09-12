import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListOrders, adminUpdateOrderStatus } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/orders")({
  component: OrdersPage,
});

const STATUSES = ["pending", "processing", "shipped", "delivered", "cancelled"] as const;
const STATUS_LABELS: Record<typeof STATUSES[number], string> = {
  pending: "قيد الانتظار",
  processing: "قيد التجهيز",
  shipped: "تم الشحن",
  delivered: "تم التسليم",
  cancelled: "ملغي",
};

function OrdersPage() {
  const list = useServerFn(adminListOrders);
  const update = useServerFn(adminUpdateOrderStatus);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => list(),
  });
  const mutation = useMutation({
    mutationFn: (input: { order_id: string; status: typeof STATUSES[number] }) =>
      update({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-orders"] }),
  });

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-couture-red mb-3">02 · الطلبات</p>
        <h1 className="font-display italic text-5xl">سجل الطلبات</h1>
      </div>
      {isLoading ? (
        <p className="eyebrow text-paper/50">جارٍ التحميل…</p>
      ) : !data || data.length === 0 ? (
        <p className="text-paper/50 text-sm">لا توجد طلبات بعد.</p>
      ) : (
        <div className="border border-white/10 divide-y divide-white/10">
          {data.map((o: any) => (
            <div key={o.id} className="grid grid-cols-12 gap-4 p-5 items-center">
              <div className="col-span-3">
                <p className="font-display italic text-lg">#{o.order_number}</p>
                <p className="micro-label text-paper/40">
                  {new Date(o.created_at).toLocaleDateString("ar-EG")}
                </p>
              </div>
              <div className="col-span-4 text-sm text-paper/70 truncate">{o.contact_email}</div>
              <div className="col-span-2 font-display italic text-xl">
                {(o.total_cents / 100).toFixed(0)} ج.م
              </div>
              <div className="col-span-3">
                <select
                  value={o.status}
                  onChange={(e) =>
                    mutation.mutate({
                      order_id: o.id,
                      status: e.target.value as typeof STATUSES[number],
                    })
                  }
                  className="w-full bg-noir border border-white/20 px-3 py-2 text-xs tracking-[0.2em] focus:border-couture-red outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
