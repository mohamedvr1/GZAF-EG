import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkIsAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

const NAV: Array<{ to: string; label: string; exact?: boolean }> = [
  { to: "/admin", label: "نظرة عامة", exact: true },
  { to: "/admin/orders", label: "الطلبات" },
  { to: "/admin/products", label: "المنتجات" },
  { to: "/admin/coupons", label: "الكوبونات" },
  { to: "/admin/applications", label: "الموردون" },
  { to: "/admin/reviews", label: "التقييمات" },
  { to: "/admin/newsletter", label: "النشرة البريدية" },
  { to: "/admin/notifications", label: "تليجرام" },
];

function AdminLayout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const fn = useServerFn(checkIsAdmin);
  const { data, isLoading, error } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div dir="rtl" className="min-h-screen bg-noir text-paper flex items-center justify-center">
        <span className="eyebrow text-paper/50">جارٍ التحقق من الصلاحيات…</span>
      </div>
    );
  }

  if (error || !data?.isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen bg-noir text-paper flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-6">
          <p className="eyebrow text-couture-red">403 · وصول مقيّد</p>
          <h1 className="font-display italic text-5xl">لوحة الإدارة فقط</h1>
          <p className="text-paper/60 text-sm leading-relaxed">
            هذه الصفحة مخصصة لمسؤولي GZAF فقط. إذا كنت تعتقد أن هذا خطأ، تواصل مع الإدارة.
          </p>
          <Link to="/" className="inline-block eyebrow text-couture-red hover:text-paper transition-colors">
            → العودة إلى المتجر
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-noir text-paper">
      <header className="border-b border-white/10 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display text-xl tracking-[0.35em]">
            GZAF
          </Link>
          <span className="text-couture-red eyebrow">/ الإدارة</span>
        </div>
        <Link to="/" className="eyebrow text-paper/60 hover:text-couture-red transition-colors">
          خروج →
        </Link>
      </header>
      <div className="flex">
        <aside className="w-56 shrink-0 border-l border-white/10 min-h-[calc(100vh-64px)] py-8">
          <nav className="flex flex-col">
            {NAV.map((item) => {
              const active = item.exact ? path === item.to : path.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-8 py-3 eyebrow border-r-2 transition-colors ${
                    active
                      ? "border-couture-red text-paper bg-white/5"
                      : "border-transparent text-paper/50 hover:text-paper hover:bg-white/5"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="flex-1 p-8 md:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
