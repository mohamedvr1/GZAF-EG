import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { products, categories, type Product } from "@/lib/catalog";
import { useWishlist } from "@/lib/store";
import { Tilt3D, Depth } from "@/components/tilt-3d";
import { Reveal } from "@/components/motion-primitives";
import { useServerFn } from "@tanstack/react-start";
import { smartSearch } from "@/lib/ai.functions";

const searchSchema = z.object({
  c: z.enum(["Women", "Men", "Accessories", "Footwear"]).optional(),
  sort: z.enum(["new", "price-asc", "price-desc"]).optional(),
  q: z.string().optional(),
});

export const Route = createFileRoute("/shop")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Shop — GZAF" },
      { name: "description", content: "GZAF luxury ready-to-wear, menswear, accessories and footwear — hand-finished in Paris, Florence and Milan ateliers." },
      { property: "og:title", content: "Shop the Collections — GZAF" },
      { property: "og:description", content: "Explore GZAF's ready-to-wear, menswear, accessories and footwear — architectural silhouettes in Italian silk and couture crimson." },
      { property: "og:url", content: "/shop" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "/shop" }],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { c, sort, q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const wishlist = useWishlist();
  const smart = useServerFn(smartSearch);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [priceMax, setPriceMax] = useState<number | null>(null);


  const filtered = useMemo(() => {
    let list: Product[] = [...products];
    if (c) list = list.filter((p) => p.category === c);
    if (priceMax != null) list = list.filter((p) => p.price <= priceMax);
    if (q && q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.meta.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle),
      );
    }
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "new")
      list.sort((a, b) => Number(!!b.isNew) - Number(!!a.isNew));
    return list;
  }, [c, sort, q, priceMax]);

  const runSmartSearch = async () => {
    if (!aiInput.trim() || aiBusy) return;
    setAiBusy(true);
    try {
      const res = await smart({ data: { query: aiInput.trim() } });
      const cat = res.category as typeof categories[number] | null;
      const validCat = cat && (categories as readonly string[]).includes(cat) ? cat : undefined;
      setPriceMax(res.maxPriceUsd);
      const kw = (res.keywords && res.keywords[0]) || res.intent || aiInput;
      navigate({ search: { c: validCat, sort, q: kw } });
    } finally {
      setAiBusy(false);
    }
  };


  return (
    <div className="min-h-screen bg-noir text-paper font-sans">
      <SiteHeader />
      <main>

      <section className="px-6 md:px-8 pt-16 pb-10 border-b border-white/5">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-10 bg-couture-red" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red font-medium">
              The Boutique
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl italic mb-6 text-paper">
            {c ?? "All Collections"}
          </h1>
          <p className="text-paper/55 max-w-xl text-sm tracking-wide mb-8">
            {filtered.length} pieces — hand-finished across our Paris, Florence and Milan ateliers.
          </p>

          <div className="max-w-2xl border-l-2 border-couture-red pl-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-couture-red mb-2">AI Curator</p>
            <div className="flex gap-3 items-center">
              <input
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSmartSearch()}
                placeholder="e.g. black evening dress under $3000"
                aria-label="AI curator query"
                className="flex-1 bg-transparent border-b border-white/20 focus:border-couture-red outline-none py-2 text-sm text-paper placeholder:text-paper/30"
              />
              <button
                onClick={runSmartSearch}
                disabled={aiBusy || !aiInput.trim()}
                className="text-[10px] uppercase tracking-[0.25em] text-couture-red hover:text-paper transition-colors disabled:opacity-40"
              >
                {aiBusy ? "Curating…" : "Curate →"}
              </button>
            </div>
            {priceMax != null && (
              <p className="mt-2 text-[10px] text-paper/50">
                Filtered under {priceMax.toLocaleString()} EGP ·{" "}
                <button onClick={() => setPriceMax(null)} className="underline">clear</button>
              </p>
            )}
          </div>
        </div>
      </section>


      {/* Filter bar */}
      <div className="sticky top-[64px] z-40 bg-noir/85 backdrop-blur-xl border-b border-white/5 px-4 sm:px-6 md:px-8 py-4">
        <div className="max-w-[1600px] mx-auto flex flex-wrap gap-3 md:gap-8 items-center justify-between">
          <div />


          <div className="flex flex-wrap gap-3 sm:gap-4 items-center min-w-0 w-full sm:w-auto justify-end">
            <div className="relative flex-1 sm:flex-none min-w-0">
              <input
                value={q ?? ""}
                onChange={(e) =>
                  navigate({ search: { c, sort, q: e.target.value || undefined } })
                }
                placeholder="SEARCH"
                aria-label="Search products"
                className="bg-transparent border-b border-white/20 focus:border-couture-red outline-none px-2 py-1.5 text-[11px] uppercase tracking-[0.22em] text-paper placeholder:text-paper/30 transition-colors w-full sm:w-40"
              />
            </div>
            <select
              value={sort ?? ""}
              aria-label="Sort products"
              onChange={(e) =>
                navigate({
                  search: {
                    c,
                    q,
                    sort: (e.target.value || undefined) as
                      | "new"
                      | "price-asc"
                      | "price-desc"
                      | undefined,
                  },
                })
              }
              className="bg-noir border-b border-white/20 outline-none text-[11px] uppercase tracking-[0.22em] text-paper px-2 py-1.5 cursor-pointer hover:border-couture-red transition-colors"
            >
              <option value="">Sort · Curator's Order</option>
              <option value="new">Newest First</option>
              <option value="price-asc">Price · Low to High</option>
              <option value="price-desc">Price · High to Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid */}
      <section className="px-6 md:px-8 py-16">
        <div className="max-w-[1600px] mx-auto">
          {filtered.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-display italic text-3xl text-paper/60">
                No pieces match this search.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10 [perspective:1400px]">
              {filtered.map((p, i) => (
                <Reveal key={p.slug} delay={(i % 8) * 60}>
                  <div className="group relative">
                    <Tilt3D intensity={6}>
                      <Link
                        to="/product/$slug"
                        params={{ slug: p.slug }}
                        className="block"
                      >
                        <div className="aspect-[3/4] bg-black mb-5 overflow-hidden relative shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)]">
                          <img
                            src={p.images[0]}
                            alt={p.name}
                            width={700}
                            height={900}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-[1.06]"
                          />
                          {p.isNew && (
                            <Depth z={30}>
                              <span className="absolute top-4 left-4 bg-couture-red text-paper text-[9px] uppercase tracking-[0.25em] px-2 py-1">
                                New
                              </span>
                            </Depth>
                          )}
                        </div>
                        <Depth z={15}>
                          <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] mb-1.5 text-paper group-hover:text-couture-red transition-colors">
                            {p.name}
                          </h3>
                          <p className="text-[11px] text-paper/50 tracking-wide">
                            {p.meta} <span className="mx-1 text-couture-red">·</span> {p.price.toLocaleString()} EGP
                          </p>
                        </Depth>
                      </Link>
                    </Tilt3D>
                    <button
                      onClick={() => wishlist.toggle(p.slug)}
                      aria-label={wishlist.has(p.slug) ? "Remove from wishlist" : "Save"}
                      className="absolute top-4 right-4 size-8 flex items-center justify-center text-paper/60 hover:text-couture-red transition-colors bg-noir/40 backdrop-blur-sm z-10"
                    >
                      {wishlist.has(p.slug) ? "♥" : "♡"}
                    </button>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      </main>
      <SiteFooter />
    </div>
  );
}
