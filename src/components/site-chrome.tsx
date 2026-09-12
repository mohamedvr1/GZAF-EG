import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCart, useWishlist } from "@/lib/store";
import { useAuth } from "@/lib/use-auth";
import { checkIsAdmin } from "@/lib/admin.functions";

export function SiteHeader() {
  const { count } = useCart();
  const { slugs } = useWishlist();
  const { isAuthenticated, loading } = useAuth();
  const fn = useServerFn(checkIsAdmin);
  const { data: adminCheck } = useQuery({
    queryKey: ["is-admin", isAuthenticated],
    queryFn: () => fn(),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  });

  return (
    <>

      <nav className="sticky top-0 z-50 bg-noir/85 backdrop-blur-xl border-b border-white/5 px-6 md:px-8 py-5 flex justify-between items-center">
        <div />


        <div className="flex flex-wrap gap-x-4 gap-y-1 md:gap-8 text-[10px] md:text-[11px] uppercase tracking-[0.2em] font-medium text-paper/80 justify-end">
          <Link to="/wishlist" className="hover:text-couture-red transition-colors">
            Saved {slugs.length > 0 ? `(${slugs.length})` : ""}
          </Link>
          <Link to="/limited" className="text-couture-red hover:text-paper transition-colors">
            Limited
          </Link>
          {loading ? (
            <span className="text-paper/40">···</span>
          ) : isAuthenticated ? (
            <>
              {adminCheck?.isAdmin && (
                <Link to="/admin" className="text-couture-red hover:text-paper transition-colors">
                  Admin
                </Link>
              )}
              <Link to="/concierge" className="text-couture-red hover:text-paper transition-colors">
                Concierge
              </Link>
              <Link to="/account" className="hover:text-couture-red transition-colors">
                Account
              </Link>
            </>
          ) : (
            <Link to="/auth" className="hover:text-couture-red transition-colors">
              Sign in
            </Link>
          )}
          <Link to="/cart" className="hover:text-couture-red transition-colors">
            Bag ({count})
          </Link>
        </div>
      </nav>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-black text-paper/45 pt-20 pb-10 px-8 border-t border-white/5">
      <div className="max-w-[1600px] mx-auto">
        <div className="mb-16">
          <div className="font-display text-3xl tracking-[0.35em] text-paper mb-6">GZAF</div>
          <p className="text-xs leading-loose max-w-xs">
            A luxury house dedicated to the art of fine garment making. Sustainability through
            longevity, excellence through craft.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-between gap-4 pt-8 border-t border-white/5 text-[9px] uppercase tracking-[0.25em] text-paper/40">
          <span>© 2026 GZAF Maison. All Rights Reserved.</span>
          <div className="flex flex-wrap gap-6 md:gap-8">
            <Link to="/track" className="hover:text-couture-red transition-colors">تتبع الطلب</Link>
            <Link to="/privacy" className="hover:text-couture-red transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-couture-red transition-colors">Terms of Service</Link>
            <Link to="/cookies" className="hover:text-couture-red transition-colors">Cookies</Link>
          </div>

        </div>
      </div>
    </footer>
  );
}

type FooterItem = { label: string; to: string; search?: Record<string, string>; hash?: string };

function FooterCol({ title, items }: { title: string; items: FooterItem[] }) {
  return (
    <div className="flex flex-col gap-3.5 text-[10px] uppercase tracking-[0.22em]">
      <span className="text-paper font-semibold mb-2">{title}</span>
      {items.map((item) => {
        const href =
          item.to +
          (item.search
            ? "?" +
              new URLSearchParams(item.search as Record<string, string>).toString()
            : "") +
          (item.hash ? `#${item.hash}` : "");
        return (
          <a
            key={item.label}
            href={href}
            className="hover:text-couture-red transition-colors"
          >
            {item.label}
          </a>
        );
      })}
    </div>
  );
}
