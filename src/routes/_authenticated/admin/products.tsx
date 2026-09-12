import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  adminListProducts,
  adminToggleProduct,
  adminCreateVariant,
  adminUpdateVariantStock,
} from "@/lib/admin.functions";
import { generateProductDescription } from "@/lib/ai.functions";

export const Route = createFileRoute("/_authenticated/admin/products")({
  component: ProductsPage,
});

function ProductsPage() {
  const list = useServerFn(adminListProducts);
  const toggle = useServerFn(adminToggleProduct);
  const createVariant = useServerFn(adminCreateVariant);
  const updateStock = useServerFn(adminUpdateVariantStock);
  const genDesc = useServerFn(generateProductDescription);
  const qc = useQueryClient();
  const [descFor, setDescFor] = useState<string | null>(null);
  const [descText, setDescText] = useState<string>("");
  const [descBusy, setDescBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => list(),
  });

  const toggleMut = useMutation({
    mutationFn: (i: { product_id: string; is_active: boolean }) => toggle({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
  const variantMut = useMutation({
    mutationFn: (i: any) => createVariant({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });
  const stockMut = useMutation({
    mutationFn: (i: { variant_id: string; stock: number }) => updateStock({ data: i }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-products"] }),
  });

  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow text-couture-red mb-3">03 · المنتجات</p>
        <h1 className="font-display italic text-5xl">الكتالوج والمخزون</h1>
      </div>

      {isLoading ? (
        <p className="eyebrow text-paper/50">جارٍ التحميل…</p>
      ) : (
        <div className="border border-white/10 divide-y divide-white/10">
          {(data ?? []).map((p: any) => (
            <div key={p.id}>
              <div className="grid grid-cols-12 gap-4 p-5 items-center">
                <div className="col-span-5">
                  <p className="font-display italic text-lg">{p.name}</p>
                  <p className="micro-label text-paper/40">{p.categories?.name ?? "—"}</p>
                </div>
                <div className="col-span-2 font-display italic text-xl">
                  {(p.price_cents / 100).toFixed(0)} ج.م
                </div>
                <div className="col-span-2 text-xs text-paper/60">
                  {p.product_variants?.length ?? 0} متغيرات
                </div>
                <div className="col-span-1">
                  <button
                    onClick={() =>
                      toggleMut.mutate({ product_id: p.id, is_active: !p.is_active })
                    }
                    className={`eyebrow px-3 py-1.5 border ${
                      p.is_active
                        ? "border-couture-red text-couture-red"
                        : "border-white/20 text-paper/40"
                    }`}
                  >
                    {p.is_active ? "معروض" : "مخفي"}
                  </button>
                </div>
                <div className="col-span-2 text-left space-x-3 space-x-reverse">
                  <button
                    onClick={async () => {
                      if (descBusy) return;
                      setDescFor(p.id);
                      setDescText("");
                      setDescBusy(true);
                      try {
                        const r = await genDesc({
                          data: {
                            name: p.name,
                            category: p.categories?.name ?? null,
                            priceUsd: (p.price_cents ?? 0) / 100,
                          },
                        });
                        setDescText(r.description);
                      } finally {
                        setDescBusy(false);
                      }
                    }}
                    className="eyebrow text-couture-red hover:text-paper"
                    title="وصف بالذكاء الاصطناعي"
                  >
                    ✦ وصف AI
                  </button>
                  <button
                    onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                    className="eyebrow text-paper/60 hover:text-couture-red"
                  >
                    {expanded === p.id ? "إغلاق" : "المتغيرات →"}
                  </button>
                </div>
              </div>
              {descFor === p.id && (
                <div className="bg-white/5 p-6 border-t border-couture-red/40">
                  <div className="flex items-baseline justify-between mb-3">
                    <p className="eyebrow text-couture-red">مسودة وصف AI</p>
                    <button
                      onClick={() => setDescFor(null)}
                      className="eyebrow text-paper/40 hover:text-paper"
                    >
                      ×
                    </button>
                  </div>
                  {descBusy ? (
                    <p className="italic text-paper/60">جارٍ الكتابة…</p>
                  ) : (
                    <>
                      <p className="whitespace-pre-line text-paper/85 font-serif leading-relaxed">
                        {descText}
                      </p>
                      <button
                        onClick={() => navigator.clipboard.writeText(descText)}
                        className="mt-4 eyebrow text-couture-red hover:text-paper"
                      >
                        نسخ →
                      </button>
                    </>
                  )}
                </div>
              )}
              {expanded === p.id && (
                <VariantsPanel
                  product={p}
                  onAdd={(v) => variantMut.mutate({ ...v, product_id: p.id })}
                  onStock={(variant_id, stock) => stockMut.mutate({ variant_id, stock })}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VariantsPanel({
  product,
  onAdd,
  onStock,
}: {
  product: any;
  onAdd: (v: { sku: string; size?: string; color?: string; stock: number }) => void;
  onStock: (variant_id: string, stock: number) => void;
}) {
  const [sku, setSku] = useState("");
  const [size, setSize] = useState("");
  const [color, setColor] = useState("");
  const [stock, setStock] = useState(0);

  return (
    <div className="bg-white/5 p-6 space-y-4">
      <div className="space-y-2">
        {(product.product_variants ?? []).map((v: any) => (
          <div key={v.id} className="grid grid-cols-12 gap-3 items-center text-sm">
            <div className="col-span-4 font-mono text-paper/70">{v.sku}</div>
            <div className="col-span-2 text-paper/60">{v.size ?? "—"}</div>
            <div className="col-span-2 text-paper/60">{v.color ?? "—"}</div>
            <div className="col-span-4">
              <input
                type="number"
                defaultValue={v.stock}
                onBlur={(e) => {
                  const n = Number(e.target.value);
                  if (n !== v.stock) onStock(v.id, n);
                }}
                className="w-24 bg-noir border border-white/20 px-2 py-1 text-sm focus:border-couture-red outline-none"
              />
              <span className="mr-2 micro-label text-paper/40">في المخزون</span>
            </div>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-white/10">
        <p className="micro-label text-paper/40 mb-2">إضافة متغير</p>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="bg-noir border border-white/20 px-3 py-1.5 text-sm focus:border-couture-red outline-none"
          />
          <input
            placeholder="المقاس"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-20 bg-noir border border-white/20 px-3 py-1.5 text-sm focus:border-couture-red outline-none"
          />
          <input
            placeholder="اللون"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-24 bg-noir border border-white/20 px-3 py-1.5 text-sm focus:border-couture-red outline-none"
          />
          <input
            type="number"
            placeholder="الكمية"
            value={stock}
            onChange={(e) => setStock(Number(e.target.value))}
            className="w-20 bg-noir border border-white/20 px-3 py-1.5 text-sm focus:border-couture-red outline-none"
          />
          <button
            onClick={() => {
              if (!sku) return;
              onAdd({ sku, size: size || undefined, color: color || undefined, stock });
              setSku("");
              setSize("");
              setColor("");
              setStock(0);
            }}
            className="bg-couture-red text-paper eyebrow px-4 py-1.5 hover:bg-couture-red-deep"
          >
            إضافة
          </button>
        </div>
      </div>
    </div>
  );
}
