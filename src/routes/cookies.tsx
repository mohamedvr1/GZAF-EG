import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Cookies — GZAF Maison" },
      {
        name: "description",
        content:
          "How GZAF Maison uses cookies and local storage to keep you signed in, remember your cart, and secure your session.",
      },
      { property: "og:title", content: "Cookies — GZAF Maison" },
      {
        property: "og:description",
        content:
          "How GZAF Maison uses cookies and local storage.",
      },
      { property: "og:url", content: "https://gzaf-eg.lovable.app/cookies" },
      { name: "robots", content: "index,follow" },
    ],
    links: [{ rel: "canonical", href: "https://gzaf-eg.lovable.app/cookies" }],
  }),
  component: CookiesPage,
});

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid md:grid-cols-[80px_1fr] gap-6 md:gap-12 py-10 border-t border-paper/10">
      <div className="text-[10px] tracking-[0.35em] text-couture-red pt-1">{n}</div>
      <div>
        <h2 className="font-display italic text-2xl md:text-3xl mb-4 text-paper">
          {title}
        </h2>
        <div className="text-paper/70 text-sm leading-loose space-y-3">
          {children}
        </div>
      </div>
    </section>
  );
}

function CookiesPage() {
  return (
    <main className="bg-noir text-paper min-h-screen">
      <header className="max-w-4xl mx-auto px-6 md:px-12 pt-24 pb-10">
        <p className="text-[10px] tracking-[0.35em] text-couture-red mb-6">
          GZAF MAISON — LEGAL
        </p>
        <h1 className="font-display italic text-5xl md:text-7xl leading-[1.05] mb-6">
          Cookies <br /> &amp; Storage
        </h1>
        <p className="text-paper/60 text-sm max-w-2xl leading-loose">
          This page explains the cookies and local storage entries used on{" "}
          <span className="text-paper">gzaf.eg</span>. Last updated{" "}
          <span className="text-paper">July 18, 2026</span>.
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-6 md:px-12 pb-24">
        <Section n="01" title="What we use">
          <p>
            The Maison uses only strictly necessary cookies and browser local
            storage — the minimum required to operate the boutique. We do
            <span className="text-paper"> not </span> use advertising cookies,
            cross-site tracking, or third-party marketing pixels.
          </p>
        </Section>

        <Section n="02" title="Authentication session">
          <p>
            When you sign in, a secure session token is stored in your
            browser so the site can recognise you between pages and refresh
            your access without asking for your password on every visit. The
            token is removed when you sign out.
          </p>
        </Section>

        <Section n="03" title="Cart & wishlist">
          <p>
            Your cart, wishlist, and last-used checkout details are kept in
            your browser&rsquo;s local storage so they survive page reloads
            and remain available the next time you visit from the same
            device. Clearing your browser data removes them.
          </p>
        </Section>

        <Section n="04" title="Welcome offer">
          <p>
            A small flag is stored in local storage to remember that you have
            already seen the welcome pop-up, so it does not reappear on every
            visit.
          </p>
        </Section>

        <Section n="05" title="Security & abuse protection">
          <p>
            Short-lived cookies and headers are used by our platform to
            protect the site from fraud, abuse, and automated attacks.
          </p>
        </Section>

        <Section n="06" title="Managing cookies">
          <p>
            You can clear cookies and local storage at any time from your
            browser settings. Removing the session token signs you out;
            removing local storage empties your cart, wishlist, and saved
            checkout details on this device.
          </p>
          <p>
            Because we do not use marketing cookies, no consent banner is
            required — the storage described above is essential for the
            boutique to function.
          </p>
        </Section>

        <Section n="07" title="Contact">
          <p>
            Questions about cookies or storage? Write to{" "}
            <a
              href="mailto:privacy@gzaf.eg"
              className="text-paper underline underline-offset-4 hover:text-couture-red"
            >
              privacy@gzaf.eg
            </a>
            .
          </p>
        </Section>

        <div className="pt-16">
          <Link
            to="/"
            className="text-[10px] tracking-[0.35em] uppercase text-paper/50 hover:text-couture-red transition-colors"
          >
            ← Return to the Maison
          </Link>
        </div>
      </div>
    </main>
  );
}
