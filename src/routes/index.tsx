import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { products } from "@/lib/catalog";
import { Tilt3D, Depth } from "@/components/tilt-3d";
import { Reveal } from "@/components/motion-primitives";

const Logo3D = lazy(() => import("@/components/logo-3d"));

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GZAF — Maison de Couture" },
      {
        name: "description",
        content:
          "The GZAF tracksuit — architectural streetwear, hand-finished in the Cairo atelier.",
      },
      { property: "og:title", content: "GZAF — Maison de Couture" },
      {
        property: "og:description",
        content:
          "The GZAF tracksuit — architectural streetwear, hand-finished in the Cairo atelier.",
      },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

function Index() {
  const featured = products;

  return (
    <div className="min-h-screen bg-noir text-paper font-sans selection:bg-couture-red selection:text-paper overflow-x-hidden">
      <SiteHeader />
      <main>

      {/* 01 HERO */}
      <section className="relative flex items-center justify-center px-4 sm:px-6 md:px-12 pt-6 pb-2 md:pt-10 md:pb-6 overflow-hidden border-b border-white/5">
        <div className="w-full relative z-10 flex flex-col items-center">
          <Reveal>
            <div className="w-[72vw] sm:w-[60vw] md:w-[50vw] lg:w-[42vw] aspect-square max-h-[50vh] md:max-h-[60vh]">
              <ClientOnly>
                <Suspense fallback={null}>
                  <Logo3D />
                </Suspense>
              </ClientOnly>
            </div>
          </Reveal>
        </div>
      </section>

      {/* 02 CURRENT SELECTION */}
      <section id="collection" className="py-8 md:py-20 px-4 sm:px-6 md:px-12">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-2 mb-8 md:mb-16 sm:flex sm:flex-wrap sm:gap-4">
          <span className="col-span-2 sm:col-span-1 text-couture-red text-[10px] md:text-xs font-bold tracking-[0.4em] shrink-0">02</span>
          <h2 className="font-display text-3xl sm:text-4xl md:text-6xl italic min-w-0 truncate">Current Selection</h2>
          <Link
            to="/shop"
            className="justify-self-end sm:ml-auto shrink-0 text-[10px] uppercase tracking-[0.3em] md:tracking-[0.4em] border-b border-paper/30 pb-1 hover:text-couture-red hover:border-couture-red transition-colors"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8 md:gap-10 [perspective:1400px]">
          {featured.map((p, i) => (
            <Reveal key={p.slug} delay={i * 90}>
              <Tilt3D intensity={6}>
                <Link to="/product/$slug" params={{ slug: p.slug }} className="group block">
                  <div className="aspect-[3/4] bg-[#111] mb-5 overflow-hidden relative shadow-[0_30px_60px_-25px_rgba(0,0,0,0.9)]">
                    <img
                      src={p.images[0]}
                      alt={p.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover transition-transform duration-[1000ms] ease-out group-hover:scale-[1.06]"
                    />
                    <div className="absolute inset-0 bg-couture-red/0 group-hover:bg-couture-red/5 transition-colors duration-500" />
                  </div>
                  <Depth z={20}>
                    <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] mb-1.5 group-hover:text-couture-red transition-colors">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-paper/50 tracking-wide">
                      {p.meta} <span className="mx-1 text-couture-red">·</span> {p.price.toLocaleString()} EGP
                    </p>
                  </Depth>
                </Link>
              </Tilt3D>
            </Reveal>
          ))}
        </div>
      </section>

      </main>
      <SiteFooter />
    </div>
  );
}
