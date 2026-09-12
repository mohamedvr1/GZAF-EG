import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — GZAF Maison" },
      {
        name: "description",
        content:
          "How GZAF Maison collects, uses, and safeguards your personal information when you shop with us in Egypt.",
      },
      { property: "og:title", content: "Privacy Policy — GZAF Maison" },
      {
        property: "og:description",
        content:
          "How GZAF Maison collects, uses, and safeguards your personal information.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPage,
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
      <div className="text-[10px] tracking-[0.35em] text-couture-red pt-1">
        {n}
      </div>
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

function PrivacyPage() {
  return (
    <main className="bg-noir text-paper min-h-screen">
      <header className="max-w-4xl mx-auto px-6 md:px-12 pt-24 pb-10">
        <p className="text-[10px] tracking-[0.35em] text-couture-red mb-6">
          GZAF MAISON — LEGAL
        </p>
        <h1 className="font-display italic text-5xl md:text-7xl leading-[1.05] mb-6">
          Privacy <br /> Policy
        </h1>
        <p className="text-paper/60 text-sm max-w-2xl leading-loose">
          This page explains what information GZAF Maison collects when you
          visit our site or place an order, how we use it, and the choices you
          have. It is maintained by GZAF Maison and last updated on{" "}
          <span className="text-paper">July 18, 2026</span>.
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-6 md:px-12 pb-24">
        <Section n="01" title="Who we are">
          <p>
            GZAF Maison is an atelier based in the Arab Republic of Egypt,
            operating the storefront available at{" "}
            <span className="text-paper">gzaf.eg</span>. References to
            &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;the Maison&rdquo;
            refer to GZAF Maison.
          </p>
        </Section>

        <Section n="02" title="Information we collect">
          <p>We collect only what we need to fulfil your order and improve your experience:</p>
          <ul className="list-disc list-inside space-y-2 marker:text-couture-red">
            <li>Identity &amp; contact: full name, email, phone number.</li>
            <li>Shipping details: governorate, city, street address.</li>
            <li>Order data: items, sizes, totals, order status, notes.</li>
            <li>Account data: authentication identifier, saved wishlist &amp; cart.</li>
            <li>Technical data: device, browser, and basic session information used to keep the site secure.</li>
          </ul>
          <p>
            We do <span className="text-paper">not</span> store any card or
            banking details — all orders are settled via Cash on Delivery in
            Egyptian Pounds.
          </p>
        </Section>

        <Section n="03" title="How we use it">
          <ul className="list-disc list-inside space-y-2 marker:text-couture-red">
            <li>To process, dispatch and deliver your order inside Egypt.</li>
            <li>To contact you about your order, including via our courier or a Maison representative.</li>
            <li>To provide account features: order history, saved addresses, wishlist.</li>
            <li>To send the welcome discount and, if you subscribed, private previews and new-collection announcements.</li>
            <li>To detect abuse, prevent fraudulent orders, and secure the platform.</li>
          </ul>
        </Section>

        <Section n="04" title="Legal basis">
          <p>
            We process your data to perform the sale contract you enter with
            the Maison, to comply with Egyptian consumer-protection and tax
            obligations, on the basis of your consent (for marketing emails),
            and on our legitimate interest in operating a safe boutique.
          </p>
        </Section>

        <Section n="05" title="Sharing">
          <p>Your data is never sold. It is shared only with:</p>
          <ul className="list-disc list-inside space-y-2 marker:text-couture-red">
            <li>The courier assigned to deliver your order.</li>
            <li>Our infrastructure providers, who host the site and database on our behalf under confidentiality obligations.</li>
            <li>Authorities, where disclosure is required by Egyptian law.</li>
          </ul>
        </Section>

        <Section n="06" title="Retention">
          <p>
            Order records are kept for as long as required by Egyptian
            commercial and tax law. Account and marketing data are kept while
            your account is active; you may request deletion at any time.
          </p>
        </Section>

        <Section n="07" title="Your rights">
          <p>
            You may request access to your data, correction of inaccurate
            information, deletion of your account, or withdrawal of your
            consent to marketing communications. To exercise any of these
            rights, write to{" "}
            <a
              href="mailto:privacy@gzaf.eg"
              className="text-paper underline underline-offset-4 hover:text-couture-red"
            >
              privacy@gzaf.eg
            </a>
            .
          </p>
        </Section>

        <Section n="08" title="Cookies">
          <p>
            We use strictly necessary cookies and local storage to keep you
            signed in, remember your cart and wishlist, and secure your
            session. We do not use third-party advertising cookies.
          </p>
        </Section>

        <Section n="09" title="Security">
          <p>
            Access to customer data is protected by row-level security,
            role-based access controls and audit logs. Passwords are hashed and
            checked against known breach lists before acceptance.
          </p>
        </Section>

        <Section n="10" title="Changes to this policy">
          <p>
            When we update this policy we revise the date at the top of the
            page. Material changes will be announced to registered clients by
            email.
          </p>
        </Section>

        <Section n="11" title="Contact">
          <p>
            GZAF Maison — Cairo, Egypt. <br />
            Privacy:{" "}
            <a
              href="mailto:privacy@gzaf.eg"
              className="text-paper underline underline-offset-4 hover:text-couture-red"
            >
              privacy@gzaf.eg
            </a>
            <br />
            Client care:{" "}
            <a
              href="mailto:care@gzaf.eg"
              className="text-paper underline underline-offset-4 hover:text-couture-red"
            >
              care@gzaf.eg
            </a>
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
