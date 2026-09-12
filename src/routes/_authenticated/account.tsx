import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { supabase } from "@/integrations/supabase/client";
import { listMyOrders, getMyProfile, updateMyProfile } from "@/lib/orders.functions";

const searchSchema = z.object({
  placed: z.string().optional(),
  tab: z.enum(["orders", "profile", "addresses"]).optional(),
});

export const Route = createFileRoute("/_authenticated/account")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Account — GZAF" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

function AccountPage() {
  const { placed, tab } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(tab ?? "orders");

  const fetchOrders = useServerFn(listMyOrders);
  const fetchProfile = useServerFn(getMyProfile);
  const saveProfile = useServerFn(updateMyProfile);

  const ordersQuery = useQuery({
    queryKey: ["orders", "mine"],
    queryFn: () => fetchOrders(),
  });

  const profileQuery = useQuery({
    queryKey: ["profile", "mine"],
    queryFn: () => fetchProfile(),
  });

  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-noir text-paper font-sans flex flex-col">
      <SiteHeader />

      <section className="flex-1 px-6 md:px-8 py-16 md:py-24">
        <div className="max-w-[1400px] mx-auto">
          {placed && (
            <div className="mb-10 border border-couture-red/40 bg-couture-red/5 p-6">
              <p className="text-[10px] uppercase tracking-[0.35em] text-couture-red mb-2">
                Reservation confirmed
              </p>
              <p className="font-display italic text-2xl">
                Order {placed} has been placed with the atelier.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            {/* Sidebar */}
            <aside className="lg:col-span-3">
              <div className="flex items-center gap-3 mb-4">
                <span className="h-px w-10 bg-couture-red" />
                <span className="text-[10px] uppercase tracking-[0.35em] text-couture-red font-medium">
                  Your Salon
                </span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl italic mb-10">
                Maison Account
              </h1>
              <nav className="flex flex-row lg:flex-col gap-1 lg:gap-2 text-[11px] uppercase tracking-[0.22em]">
                {(["orders", "profile", "addresses"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setActiveTab(t)}
                    className={`text-left py-3 px-4 border-l-2 transition-colors ${
                      activeTab === t
                        ? "border-couture-red text-couture-red bg-couture-red/5"
                        : "border-transparent text-paper/60 hover:text-paper"
                    }`}
                  >
                    {t}
                  </button>
                ))}
                <button
                  onClick={handleSignOut}
                  className="text-left py-3 px-4 border-l-2 border-transparent text-paper/50 hover:text-couture-red transition-colors mt-4"
                >
                  Sign out
                </button>
              </nav>
            </aside>

            {/* Content */}
            <div className="lg:col-span-9">
              {activeTab === "orders" && (
                <OrdersTab query={ordersQuery} />
              )}
              {activeTab === "profile" && (
                <ProfileTab
                  query={profileQuery}
                  save={saveProfile}
                  onSaved={() =>
                    queryClient.invalidateQueries({ queryKey: ["profile", "mine"] })
                  }
                />
              )}
              {activeTab === "addresses" && <AddressesTab />}
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function OrdersTab({ query }: { query: ReturnType<typeof useQuery<any, any>> }) {
  if (query.isLoading) {
    return <p className="text-paper/50">Retrieving…</p>;
  }
  if (query.isError) {
    return <p className="text-couture-red">Could not load your orders.</p>;
  }
  const orders = (query.data ?? []) as Array<{
    id: string;
    order_number: string;
    status: string;
    total_cents: number;
    created_at: string;
    order_items: Array<{
      product_snapshot: { image?: string; name?: string };
      quantity: number;
    }>;
  }>;

  return (
    <div>
      <h2 className="font-display text-3xl italic mb-8">Orders</h2>
      {orders.length === 0 ? (
        <div className="border border-white/10 p-12 text-center">
          <p className="font-display italic text-2xl text-paper/60 mb-6">
            No orders placed yet.
          </p>
          <Link
            to="/shop"
            className="inline-block border-b border-couture-red text-couture-red text-[11px] uppercase tracking-[0.3em] pb-1"
          >
            Discover the collection
          </Link>
        </div>
      ) : (
        <div className="border-y border-white/10 divide-y divide-white/10">
          {orders.map((o) => (
            <div
              key={o.id}
              className="py-6 flex flex-col md:flex-row gap-6 md:items-center"
            >
              <div className="md:w-40">
                <p className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-1">
                  Reservation
                </p>
                <p className="font-display text-xl">{o.order_number}</p>
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-2">
                  {new Date(o.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
                <div className="flex -space-x-3">
                  {o.order_items.slice(0, 5).map((it, i) => (
                    <div
                      key={i}
                      className="size-12 bg-black overflow-hidden ring-1 ring-noir"
                    >
                      {it.product_snapshot?.image && (
                        <img
                          src={it.product_snapshot.image}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  ))}
                  {o.order_items.length > 5 && (
                    <div className="size-12 bg-black/60 ring-1 ring-noir flex items-center justify-center text-[10px] text-paper/60">
                      +{o.order_items.length - 5}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-1">
                  Total
                </p>
                <p className="font-display text-2xl">
                  {(o.total_cents / 100).toLocaleString()} EGP
                </p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-couture-red mt-1">
                  {o.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({
  query,
  save,
  onSaved,
}: {
  query: ReturnType<typeof useQuery<any, any>>;
  save: (args: { data: { full_name?: string; phone?: string } }) => Promise<any>;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (query.data) {
      setFullName(query.data.full_name ?? "");
      setPhone(query.data.phone ?? "");
    }
  }, [query.data]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await save({ data: { full_name: fullName || undefined, phone: phone || undefined } });
      setMsg("Saved.");
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-3xl italic mb-8">Profile</h2>
      <form onSubmit={onSubmit} className="space-y-6 max-w-lg">
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-2 block">
            Full name
          </span>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full bg-transparent border-b border-white/20 focus:border-couture-red outline-none py-3 text-sm text-paper transition-colors"
          />
        </label>
        <label className="block">
          <span className="text-[10px] uppercase tracking-[0.3em] text-paper/50 mb-2 block">
            Phone
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full bg-transparent border-b border-white/20 focus:border-couture-red outline-none py-3 text-sm text-paper transition-colors"
          />
        </label>
        {msg && (
          <p className="text-[11px] tracking-wide text-couture-red">{msg}</p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="bg-paper text-noir px-10 py-4 text-[11px] uppercase tracking-[0.3em] font-semibold hover:bg-couture-red hover:text-paper transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>
    </div>
  );
}

function AddressesTab() {
  return (
    <div>
      <h2 className="font-display text-3xl italic mb-8">Addresses</h2>
      <div className="border border-white/10 p-8 max-w-lg">
        <p className="text-[10px] uppercase tracking-[0.3em] text-couture-red mb-3">
          Primary
        </p>
        <p className="font-display italic text-xl mb-2">No address on file</p>
        <p className="text-sm text-paper/60 mb-6">
          Address management will be available in an upcoming release.
        </p>
      </div>
    </div>
  );
}
