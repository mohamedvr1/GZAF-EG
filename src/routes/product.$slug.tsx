import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getProduct, products } from "@/lib/catalog";
import { useCart, useWishlist } from "@/lib/store";

export const Route = createFileRoute("/product/$slug")({
  loader: ({ params }) => {
    const product = getProduct(params.slug);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData, params }) =>
    loaderData
      ? {
          meta: [
            { title: `${loaderData.product.name} — GZAF` },
            { name: "description", content: loaderData.product.description },
            { property: "og:title", content: `${loaderData.product.name} — GZAF` },
            { property: "og:description", content: loaderData.product.description },
            { property: "og:image", content: loaderData.product.images[0] },
            { property: "og:url", content: `/product/${loaderData.product.slug}` },
            { property: "og:type", content: "product" },
          ],
          links: [{ rel: "canonical", href: `/product/${params.slug}` }],
          scripts: [
            {
              type: "application/ld+json",
              children: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: loaderData.product.name,
                image: loaderData.product.images,
                description: loaderData.product.description,
                brand: { "@type": "Brand", name: "GZAF" },
                offers: {
                  "@type": "Offer",
                  price: loaderData.product.price,
                  priceCurrency: "EGP",
                  availability: "https://schema.org/InStock",
                },
              }),
            },
          ],
        }
      : { meta: [{ title: "Not found — GZAF" }, { name: "robots", content: "noindex" }] },
  notFoundComponent: NotFound,
  component: ProductPage,
});

function NotFound() {
  return (
    <div className="min-h-screen bg-noir text-paper">
      <SiteHeader />
      <main className="flex items-center justify-center py-40 text-center">
        <div>
          <h1 className="font-display text-6xl italic mb-4">Not in this season.</h1>
          <Link to="/shop" className="text-couture-red text-[11px] uppercase tracking-[0.3em] border-b border-couture-red pb-1">
            Return to shop
          </Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ProductPage() {
  const { product } = Route.useLoaderData();
  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize] = useState<string | undefined>(product.sizes[0]);
  const [zoom, setZoom] = useState(false);
  const cart = useCart();
  const wish = useWishlist();

  const recs = products.filter((p) => p.slug !== product.slug).slice(0, 4);

  return (
    <div className="min-h-screen bg-noir text-paper font-sans">
      <SiteHeader />
      <main>

      {/* Breadcrumb */}
      <div className="px-6 md:px-8 py-6 border-b border-white/5 text-[10px] uppercase tracking-[0.25em] text-paper/50">
        <div className="max-w-[1600px] mx-auto flex gap-2">
          <Link to="/" className="hover:text-couture-red">Home</Link>
          <span>/</span>
          <Link to="/shop" className="hover:text-couture-red">Shop</Link>
          <span>/</span>
          <span className="text-paper/80">{product.name}</span>
        </div>
      </div>

      <section className="px-6 md:px-8 py-12 md:py-20">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          {/* Gallery */}
          <div className="lg:col-span-8 flex flex-col-reverse md:flex-row gap-4">
            <div className="flex md:flex-col gap-3 md:w-24">
              {product.images.map((img: string, i: number) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  aria-label={`View image ${i + 1} of ${product.name}`}
                  aria-pressed={activeImg === i}
                  className={`aspect-[3/4] w-20 md:w-full overflow-hidden bg-black transition-opacity ${
                    activeImg === i ? "opacity-100 outline outline-1 outline-couture-red" : "opacity-50 hover:opacity-80"
                  }`}
                >
                  <img src={img} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div
              className="flex-1 aspect-[3/4] bg-black overflow-hidden relative cursor-zoom-in"
              onClick={() => setZoom((z) => !z)}
            >
              <img
                src={product.images[activeImg]}
                alt={product.name}
                width={1200}
                height={1600}
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className={`w-full h-full object-cover transition-transform duration-500 ${zoom ? "scale-[1.6] cursor-zoom-out" : ""}`}
              />
              <span className="absolute bottom-4 left-4 text-[9px] uppercase tracking-[0.3em] text-paper/50 bg-noir/60 backdrop-blur-sm px-3 py-1.5">
                {zoom ? "Click to reset" : "Click to zoom"}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="lg:col-span-4 lg:sticky lg:top-32 self-start">
            <div className="flex items-center gap-3 mb-5">
              <span className="h-px w-8 bg-couture-red" />
              <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red font-medium">
                {product.category} · {product.atelier}
              </span>
            </div>
            <h1 className="font-display text-4xl md:text-5xl italic mb-4">{product.name}</h1>
            <p className="text-paper/60 text-[11px] uppercase tracking-[0.25em] mb-8">
              {product.meta}
            </p>
            <p className="text-paper text-2xl font-display mb-10">{product.price.toLocaleString()} EGP</p>

            <p className="text-paper/70 text-sm leading-relaxed mb-10">{product.description}</p>

            {/* Sizes */}
            <div className="mb-10">
              <div className="flex justify-between items-baseline mb-4">
                <span className="text-[10px] uppercase tracking-[0.3em] text-paper/60">Size</span>
                <a href="#" className="text-[10px] uppercase tracking-[0.25em] text-couture-red hover:underline">
                  Size guide
                </a>
              </div>
              <div className="grid grid-cols-4 md:grid-cols-3 gap-2">
                {product.sizes.map((s: string) => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`py-3 text-[11px] uppercase tracking-[0.2em] border transition-colors ${
                      size === s
                        ? "border-couture-red text-couture-red bg-couture-red/5"
                        : "border-white/15 text-paper/70 hover:border-paper/40"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() =>
                  cart.add({
                    slug: product.slug,
                    name: product.name,
                    price: product.price,
                    image: product.images[0],
                    size,
                  })
                }
                className="bg-paper text-noir py-5 text-[11px] uppercase tracking-[0.3em] font-semibold hover:bg-couture-red hover:text-paper transition-colors flex items-center justify-center gap-3"
              >
                <span className="size-1 bg-couture-red" />
                Add to Bag
              </button>
              <button
                onClick={() => wish.toggle(product.slug)}
                className="border border-white/20 py-5 text-[11px] uppercase tracking-[0.3em] hover:border-couture-red hover:text-couture-red transition-colors"
              >
                {wish.has(product.slug) ? "♥ Saved" : "♡ Save to Wishlist"}
              </button>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10 space-y-4 text-[11px] uppercase tracking-[0.22em] text-paper/60">
              <p>Complimentary shipping · Handled by concierge</p>
              <p>Returns within 14 days · Atelier authentication</p>
              <p>Made in {product.atelier}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Recommendations */}
      <section className="px-6 md:px-8 py-20 border-t border-white/5">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-baseline gap-6 mb-12">
            <span className="font-display text-5xl italic text-couture-red">03</span>
            <h2 className="font-display text-3xl md:text-4xl">The Curator Suggests</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
            {recs.map((p) => (
              <Link
                key={p.slug}
                to="/product/$slug"
                params={{ slug: p.slug }}
                className="group"
              >
                <div className="aspect-[3/4] bg-black mb-4 overflow-hidden">
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-[1.05]"
                  />
                </div>
                <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] mb-1 text-paper group-hover:text-couture-red transition-colors">
                  {p.name}
                </h3>
                <p className="text-[11px] text-paper/50">{p.price.toLocaleString()} EGP</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      </main>
      <SiteFooter />
    </div>
  );
}
