import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  getNotificationSettings,
  updateNotificationSettings,
  sendTestTelegram,
} from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/admin/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const get = useServerFn(getNotificationSettings);
  const update = useServerFn(updateNotificationSettings);
  const test = useServerFn(sendTestTelegram);

  const { data, isLoading } = useQuery({
    queryKey: ["notification-settings"],
    queryFn: () => get(),
  });

  const [chatIds, setChatIds] = useState("");
  const [orders, setOrders] = useState(true);
  const [atelier, setAtelier] = useState(true);
  const [lowStock, setLowStock] = useState(true);
  const [threshold, setThreshold] = useState(3);
  const [status, setStatus] = useState<null | { kind: "ok" | "err"; msg: string }>(null);

  useEffect(() => {
    if (!data) return;
    setChatIds((data.telegram_admin_chat_ids ?? []).join("\n"));
    setOrders(data.notify_new_orders);
    setAtelier(data.notify_atelier_applications);
    setLowStock(data.notify_low_stock);
    setThreshold(data.low_stock_threshold);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      update({
        data: {
          telegram_admin_chat_ids: chatIds
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean),
          notify_new_orders: orders,
          notify_atelier_applications: atelier,
          notify_low_stock: lowStock,
          low_stock_threshold: Number.isFinite(threshold) ? threshold : 3,
        },
      }),
    onSuccess: () => {
      setStatus({ kind: "ok", msg: "تم الحفظ." });
      qc.invalidateQueries({ queryKey: ["notification-settings"] });
    },
    onError: (e) => setStatus({ kind: "err", msg: e instanceof Error ? e.message : "فشل الحفظ" }),
  });

  const testMutation = useMutation({
    mutationFn: () => test(),
    onSuccess: (r) => {
      if (r.ok) setStatus({ kind: "ok", msg: `تم إرسال اختبار إلى ${r.sent} محادثة.` });
      else setStatus({ kind: "err", msg: r.error ?? "فشل الاختبار" });
    },
    onError: (e) => setStatus({ kind: "err", msg: e instanceof Error ? e.message : "فشل الاختبار" }),
  });

  if (isLoading) {
    return <div className="eyebrow text-paper/50">جارٍ التحميل…</div>;
  }

  return (
    <div className="space-y-12 max-w-3xl">
      <div>
        <p className="eyebrow text-couture-red mb-3">09 · الإشعارات</p>
        <h1 className="font-display italic text-5xl md:text-6xl">قناة تليجرام</h1>
        <p className="text-paper/60 mt-4 text-sm leading-relaxed">
          إشعارات فورية على تليجرام: طلبات جديدة، نفاد المخزون، وطلبات الموردين.
        </p>
      </div>

      <section className="space-y-6">
        <div>
          <p className="micro-label text-paper/40 mb-2">معرّفات محادثات الإدارة</p>
          <textarea
            value={chatIds}
            onChange={(e) => setChatIds(e.target.value)}
            rows={5}
            placeholder="123456789&#10;-1001234567890"
            dir="ltr"
            className="w-full bg-transparent border border-white/20 focus:border-couture-red outline-none p-4 font-mono text-sm"
          />
          <p className="text-xs text-paper/40 mt-2 leading-relaxed">
            معرّف واحد في كل سطر. المحادثات الشخصية: رقم (مثل <span className="font-mono">123456789</span>). المجموعات والقنوات تبدأ بـ{" "}
            <span className="font-mono">-100</span>. راسل{" "}
            <a
              href="https://t.me/userinfobot"
              target="_blank"
              rel="noopener noreferrer"
              className="text-couture-red hover:text-paper transition-colors"
            >
              @userinfobot
            </a>{" "}
            على تليجرام لمعرفة معرّفك، ثم ابدأ محادثة مع البوت أولًا حتى يستطيع إرسال الرسائل إليك.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/10 border border-white/10">
          <Toggle label="الطلبات الجديدة" active={orders} onChange={setOrders} />
          <Toggle label="طلبات الموردين" active={atelier} onChange={setAtelier} />
          <Toggle label="نفاد المخزون" active={lowStock} onChange={setLowStock} />
          <div className="bg-noir p-6 flex items-center justify-between gap-4">
            <div>
              <p className="micro-label text-paper/40">حد التنبيه للمخزون</p>
              <p className="text-xs text-paper/40 mt-1">يتم التنبيه عند وصول المتغير لهذا الحد أو أقل.</p>
            </div>
            <input
              type="number"
              min={0}
              max={1000}
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-20 bg-transparent border border-white/20 focus:border-couture-red outline-none px-3 py-2 text-right font-mono"
            />
          </div>
        </div>

        <div className="flex items-center gap-6 pt-4 border-t border-white/10">
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="bg-couture-red text-noir px-8 py-4 eyebrow hover:bg-paper transition-colors disabled:opacity-40"
          >
            {saveMutation.isPending ? "جارٍ الحفظ…" : "حفظ الإعدادات"}
          </button>
          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending || chatIds.trim().length === 0}
            className="eyebrow text-paper/60 hover:text-couture-red transition-colors disabled:opacity-40"
          >
            {testMutation.isPending ? "جارٍ الإرسال…" : "إرسال اختبار →"}
          </button>
          {status ? (
            <span
              className={`text-xs eyebrow ${status.kind === "ok" ? "text-couture-red" : "text-paper/60"}`}
            >
              {status.msg}
            </span>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function Toggle({ label, active, onChange }: { label: string; active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className="bg-noir p-6 text-right hover:bg-white/5 transition-colors flex items-center justify-between gap-4"
    >
      <span className="micro-label text-paper">{label}</span>
      <span
        className={`w-10 h-5 border transition-colors relative ${
          active ? "border-couture-red bg-couture-red/20" : "border-white/20 bg-transparent"
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 transition-all ${
            active ? "left-[calc(100%-1.125rem)] bg-couture-red" : "left-0.5 bg-white/40"
          }`}
        />
      </span>
    </button>
  );
}
