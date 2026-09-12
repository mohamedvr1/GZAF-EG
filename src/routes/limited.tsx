import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useAuth } from "@/lib/use-auth";
import { SiteHeader, SiteFooter } from "@/components/site-chrome";
import { getLimitedStatus, verifyLimitedPassword } from "@/lib/limited.functions";

export const Route = createFileRoute("/limited")({
  component: LimitedPage,
  head: () => ({
    meta: [
      { title: "GZAF · Limited" },
      { name: "description", content: "Exclusive access — unlocked at 10 pieces owned." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function LimitedPage() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <div className="min-h-screen bg-noir text-paper flex flex-col">
      <SiteHeader />
      <main className="flex-1 px-6 md:px-12 py-20 max-w-[1100px] mx-auto w-full">
        <Link
          to="/"
          className="eyebrow text-paper/60 hover:text-couture-red transition-colors inline-flex items-center gap-2 mb-8"
        >
          ← Back
        </Link>
        <p className="eyebrow text-couture-red mb-4">Section · Limited</p>
        <h1 className="font-display italic text-6xl md:text-7xl mb-4">Le Cercle</h1>
        <p className="text-paper/60 max-w-2xl leading-relaxed mb-14">
          A private atelier drop, reserved for clients who have carried ten pieces of GZAF. Once
          the tenth item enters your wardrobe, a personal passphrase is issued — yours alone.
        </p>

        {loading ? (
          <p className="eyebrow text-paper/40">···</p>
        ) : !isAuthenticated ? (
          <SignedOut />
        ) : (
          <SignedIn />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function SignedOut() {
  return (
    <div className="border border-white/10 p-10 max-w-xl">
      <p className="eyebrow text-couture-red mb-4">Restricted</p>
      <p className="text-paper/70 mb-6">Sign in to see how close you are to unlocking Le Cercle.</p>
      <Link to="/auth" className="inline-block bg-couture-red text-paper eyebrow px-8 py-3 hover:bg-couture-red-deep transition-colors">
        Sign in →
      </Link>
    </div>
  );
}

function SignedIn() {
  const fn = useServerFn(getLimitedStatus);
  const verify = useServerFn(verifyLimitedPassword);
  const { data, isLoading } = useQuery({
    queryKey: ["limited-status"],
    queryFn: () => fn(),
  });

  const [pwd, setPwd] = useState("");
  const [entered, setEntered] = useState(false);
  const verifyMut = useMutation({
    mutationFn: (password: string) => verify({ data: { password } }),
  });

  if (isLoading || !data) return <p className="eyebrow text-paper/40">Loading…</p>;

  if (!data.unlocked) {
    const pct = Math.min(100, (data.count / data.target) * 100);
    const left = data.target - data.count;
    return (
      <div className="border border-white/10 p-10 max-w-xl">
        <p className="micro-label text-paper/40 mb-6">Progress toward Le Cercle</p>
        <div className="flex items-baseline gap-3 mb-6">
          <span className="font-display italic text-7xl leading-none">{data.count}</span>
          <span className="text-paper/40 text-2xl">/ {data.target}</span>
        </div>
        <div className="h-px bg-white/10 mb-3 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-couture-red transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-paper/60 text-sm">
          {left === 1
            ? "One piece away."
            : `${left} pieces remain until your passphrase is issued.`}
        </p>
      </div>
    );
  }

  // Unlocked — either show entry form, or content if the password is entered.
  if (!entered) {
    return (
      <div className="border border-couture-red p-10 max-w-xl">
        <p className="eyebrow text-couture-red mb-6">Access issued</p>
        <p className="text-paper/70 mb-4">
          Your personal passphrase has been issued. Enter it to open Le Cercle.
        </p>
        <details className="mb-8">
          <summary className="eyebrow text-paper/60 cursor-pointer hover:text-couture-red">
            Reveal my passphrase
          </summary>
          <p className="mt-4 font-mono text-2xl tracking-widest text-couture-red">
            {data.password}
          </p>
          <p className="text-xs text-paper/40 mt-2">
            (Automated Gmail delivery activates once the sender domain is verified. Until then
            your passphrase lives here.)
          </p>
        </details>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await verifyMut.mutateAsync(pwd);
            if (r.ok) setEntered(true);
          }}
          className="flex flex-col gap-4"
        >
          <input
            type="text"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="GZAF-XXXXXXXXXXXX"
            autoComplete="off"
            className="bg-noir border border-white/20 px-4 py-3 font-mono tracking-widest focus:border-couture-red outline-none"
          />
          {verifyMut.data && !verifyMut.data.ok && (
            <p className="text-couture-red text-xs">Passphrase does not match.</p>
          )}
          <button
            type="submit"
            disabled={verifyMut.isPending || !pwd}
            className="bg-couture-red text-paper eyebrow px-8 py-3 hover:bg-couture-red-deep disabled:opacity-40 transition-colors"
          >
            {verifyMut.isPending ? "Verifying…" : "Enter →"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="border border-couture-red/40 p-8">
        <p className="eyebrow text-couture-red">You are inside Le Cercle</p>
      </div>
      <div className="grid md:grid-cols-2 gap-px bg-white/10 border border-white/10">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-noir aspect-[3/4] p-8 flex flex-col justify-end">
            <p className="micro-label text-paper/40 mb-2">Reserve · {String(i).padStart(2, "0")}</p>
            <p className="font-display italic text-3xl">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  );
}
