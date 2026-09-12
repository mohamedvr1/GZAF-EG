import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  adminListCoupons,
  adminCreateCoupon,
  adminToggleCoupon,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/coupons")({
  component: CouponsPage,
});

function CouponsPage() {
  const list = useServerFn(adminListCoupons);
  const create = useServerFn(adminCreateCoupon);
  const toggle = useServerFn(adminToggleCoupon);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons"],
    queryFn: () => list(),
  });
  const createMut = useMutation({
    mutationFn: (i: any) => create({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });
  const toggleMut = useMutation({
    mutationFn: (i: { coupon_id: string; is_active: boolean }) => toggle({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const [code, setCode] = useState("");
  const [type, setType] = useState<"percent" | "fixed">("percent");
  const [value, setValue] = useState(10);
  const [min, setMin] = useState(0);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-couture-red mb-3">04 · الكوبونات</p>
        <h1 className="font-display italic text-5xl">أكواد الخصم</h1>
      </div>

      <div className="border border-white/10 p-6 space-y-4">
        <p className="micro-label text-paper/40">إنشاء كود جديد</p>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="الكود"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="bg-noir border border-white/20 px-3 py-2 text-sm focus:border-couture-red outline-none uppercase"
          />
          <select
            value={type}
            onChange={(e) => setType(e.target.value as any)}
            className="bg-noir border border-white/20 px-3 py-2 text-sm focus:border-couture-red outline-none"
          >
            <option value="percent">نسبة مئوية</option>
            <option value="fixed">مبلغ ثابت</option>
          </select>
          <input
            type="number"
            placeholder="القيمة"
            value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-24 bg-noir border border-white/20 px-3 py-2 text-sm focus:border-couture-red outline-none"
          />
          <input
            type="number"
            placeholder="أقل مبلغ"
            value={min}
            onChange={(e) => setMin(Number(e.target.value))}
            className="w-28 bg-noir border border-white/20 px-3 py-2 text-sm focus:border-couture-red outline-none"
          />
          <button
            onClick={() => {
              if (!code || !value) return;
              createMut.mutate({
                code,
                discount_type: type,
                discount_value: value,
                min_order_amount: min,
              });
              setCode("");
              setValue(10);
              setMin(0);
            }}
            className="bg-couture-red text-paper eyebrow px-5 py-2 hover:bg-couture-red-deep"
          >
            إنشاء
          </button>
        </div>
      </div>

      {isLoading ? (
        <p className="eyebrow text-paper/50">جارٍ التحميل…</p>
      ) : (
        <div className="border border-white/10 divide-y divide-white/10">
          {(data ?? []).map((c: any) => (
            <div key={c.id} className="grid grid-cols-12 gap-4 p-5 items-center">
              <div className="col-span-3 font-display italic text-2xl">{c.code}</div>
              <div className="col-span-2 text-sm text-paper/70">
                {c.discount_type === "percent" ? `${c.discount_value}%` : `${c.discount_value} ج.م`}
              </div>
              <div className="col-span-2 text-sm text-paper/50">أقل طلب {c.min_order_amount} ج.م</div>
              <div className="col-span-3 micro-label text-paper/40">
                استُخدم {c.uses_count}/{c.max_uses ?? "∞"}
              </div>
              <div className="col-span-2 text-left">
                <button
                  onClick={() =>
                    toggleMut.mutate({ coupon_id: c.id, is_active: !c.is_active })
                  }
                  className={`eyebrow px-3 py-1.5 border ${
                    c.is_active
                      ? "border-couture-red text-couture-red"
                      : "border-white/20 text-paper/40"
                  }`}
                >
                  {c.is_active ? "مفعّل" : "موقوف"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
