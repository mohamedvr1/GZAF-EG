import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { useCart } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [
      { title: "Bag — GZAF" },
      { name: "description", content: "Review the pieces in your GZAF shopping bag before checkout." },
      { property: "og:title", content: "Your Bag — GZAF" },
      { property: "og:description", content: "Review the pieces in your GZAF shopping bag before checkout." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, hydrated, setQty, remove, subtotal } = useCart();

  return (
    <div className="min-h-screen bg-noir text-paper font-sans flex flex-col">
      <SiteHeader />
      <main>

      <section className="flex-1 px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-px w-10 bg-couture-red" />
            <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red font-medium">
              Your Selection
            </span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl italic mb-14">The Bag</h1>

          {!hydrated ? (
            <p className="text-paper/50 py-20">Retrieving your selection…</p>
          ) : items.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-display italic text-3xl text-paper/60 mb-6">
                The bag is quiet for now.
              </p>
              <Link
                to="/shop"
                className="inline-block border-b border-couture-red text-couture-red text-[11px] uppercase tracking-[0.3em] pb-1"
              >
                Explore the collection
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              <div className="lg:col-span-8 divide-y divide-white/10 border-y border-white/10">
                {items.map((item) => (
                  <div
                    key={`${item.slug}-${item.size ?? ""}`}
                    className="flex gap-6 py-8"
                  >
                    <Link
                      to="/product/$slug"
                      params={{ slug: item.slug }}
                      className="w-28 md:w-32 aspect-[3/4] bg-black overflow-hidden shrink-0"
                    >
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    </Link>
                    <div className="flex-1 flex flex-col md:flex-row justify-between gap-4">
                      <div>
                        <Link
                          to="/product/$slug"
                          params={{ slug: item.slug }}
                          className="font-display text-2xl italic hover:text-couture-red transition-colors"
                        >
                          {item.name}
                        </Link>
                        {item.size && (
                          <p className="text-[11px] uppercase tracking-[0.25em] text-paper/50 mt-2">
                            Size · {item.size}
                          </p>
                        )}
                        <p className="text-[11px] uppercase tracking-[0.25em] text-paper/50 mt-1">
                          {item.price.toLocaleString()} EGP
                        </p>
                        <button
                          onClick={() => remove(item.slug, item.size)}
                          className="mt-4 text-[10px] uppercase tracking-[0.3em] text-couture-red border-b border-couture-red/50 hover:border-couture-red pb-0.5"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="flex flex-col items-start md:items-end gap-3">
                        <div className="flex items-center border border-white/15">
                          <button
                            onClick={() => setQty(item.slug, item.size, item.qty - 1)}
                            aria-label={`Decrease quantity of ${item.name}`}
                            className="size-10 hover:bg-white/5 text-paper"
                          >
                            −
                          </button>
                          <span className="w-10 text-center text-sm tabular-nums" aria-live="polite" aria-label={`Quantity: ${item.qty}`}>{item.qty}</span>
                          <button
                            onClick={() => setQty(item.slug, item.size, item.qty + 1)}
                            aria-label={`Increase quantity of ${item.name}`}
                            className="size-10 hover:bg-white/5 text-paper"
                          >
                            +
                          </button>
                        </div>
                        <p className="font-display text-xl">
                          {(item.price * item.qty).toLocaleString()} EGP
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order summary */}
              <aside className="lg:col-span-4 lg:sticky lg:top-32 self-start">
                <div className="border border-white/10 p-8 bg-black/40">
                  <h3 className="font-display text-2xl italic mb-6">Summary</h3>
                  <Row label="Subtotal" value={`${subtotal.toLocaleString()} EGP`} />
                  <Row label="Shipping" value="Complimentary" />
                  <Row label="Duties & taxes" value="Calculated at checkout" muted />
                  <div className="h-px bg-white/10 my-6" />
                  <div className="flex justify-between items-baseline mb-8">
                    <span className="text-[11px] uppercase tracking-[0.3em]">Estimated total</span>
                    <span className="font-display text-3xl">{subtotal.toLocaleString()} EGP</span>
                  </div>
                  <Link
                    to="/checkout"
                    className="block text-center bg-paper text-noir py-5 text-[11px] uppercase tracking-[0.3em] font-semibold hover:bg-couture-red hover:text-paper transition-colors"
                  >
                    Proceed to Checkout →
                  </Link>
                  <Link
                    to="/shop"
                    className="block text-center mt-3 text-[10px] uppercase tracking-[0.3em] text-paper/60 hover:text-couture-red"
                  >
                    Continue shopping
                  </Link>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between text-[11px] uppercase tracking-[0.22em] py-2">
      <span className="text-paper/60">{label}</span>
      <span className={muted ? "text-paper/40" : "text-paper"}>{value}</span>
    </div>
  );
}
