import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useWishlist } from "@/lib/store";
import { useCart } from "@/lib/store";
import { getProduct } from "@/lib/catalog";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist — GZAF" },
      { name: "description", content: "Your private GZAF wishlist — pieces saved from the couture selection to revisit and add to the bag when the moment is right." },
      { property: "og:title", content: "Your Wishlist — GZAF" },
      { property: "og:description", content: "Pieces saved from the GZAF couture selection, kept in your private wishlist." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { slugs, hydrated, remove } = useWishlist();
  const cart = useCart();
  const items = slugs.map(getProduct).filter(Boolean) as NonNullable<ReturnType<typeof getProduct>>[];

  return (
    <div className="min-h-screen bg-noir text-paper font-sans flex flex-col">
      <SiteHeader />
      <main>

      <section className="flex-1 px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-couture-red" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red font-medium">
              Private Selection
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl italic mb-14">Saved for later</h1>

          {!hydrated ? (
            <p className="text-paper/50">Retrieving…</p>
          ) : items.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display italic text-3xl text-paper/60 mb-6">
                Nothing has caught your eye yet.
              </p>
              <Link
                to="/shop"
                className="inline-block border-b border-couture-red text-couture-red text-[11px] uppercase tracking-[0.3em] pb-1"
              >
                Discover the collection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 md:gap-10">
              {items.map((p) => (
                <div key={p.slug} className="group">
                  <Link
                    to="/product/$slug"
                    params={{ slug: p.slug }}
                    className="block aspect-[3/4] bg-black overflow-hidden mb-4"
                  >
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-[1.05]"
                    />
                  </Link>
                  <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] mb-1 text-paper group-hover:text-couture-red transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-paper/50 mb-4">{p.price.toLocaleString()} EGP</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        cart.add({
                          slug: p.slug,
                          name: p.name,
                          price: p.price,
                          image: p.images[0],
                          size: p.sizes[0],
                        })
                      }
                      className="flex-1 border border-white/15 py-2.5 text-[10px] uppercase tracking-[0.22em] hover:border-couture-red hover:text-couture-red transition-colors"
                    >
                      Add to bag
                    </button>
                    <button
                      onClick={() => remove(p.slug)}
                      aria-label="Remove"
                      className="border border-white/15 size-10 flex items-center justify-center hover:border-couture-red hover:text-couture-red transition-colors"
                    >
                      ×
                    </button>
                  </div>
                </div>
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
