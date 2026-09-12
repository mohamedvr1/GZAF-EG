import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — GZAF Maison" },
      {
        name: "description",
        content:
          "The terms that govern purchases from GZAF Maison: orders, pricing, delivery, returns, and client responsibilities.",
      },
      { property: "og:title", content: "Terms of Service — GZAF Maison" },
      {
        property: "og:description",
        content:
          "The terms that govern purchases from GZAF Maison in Egypt.",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: TermsPage,
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

function TermsPage() {
  return (
    <main className="bg-noir text-paper min-h-screen">
      <header className="max-w-4xl mx-auto px-6 md:px-12 pt-24 pb-10">
        <p className="text-[10px] tracking-[0.35em] text-couture-red mb-6">
          GZAF MAISON — LEGAL
        </p>
        <h1 className="font-display italic text-5xl md:text-7xl leading-[1.05] mb-6">
          Terms of <br /> Service
        </h1>
        <p className="text-paper/60 text-sm max-w-2xl leading-loose">
          These terms govern every order placed on{" "}
          <span className="text-paper">gzaf.eg</span>. By using the site or
          completing a purchase, you accept the terms below. Last updated{" "}
          <span className="text-paper">July 18, 2026</span>.
        </p>
      </header>

      <div className="max-w-4xl mx-auto px-6 md:px-12 pb-24">
        <Section n="01" title="The Maison">
          <p>
            GZAF Maison is an atelier based in Cairo, Arab Republic of Egypt,
            operating the storefront at gzaf.eg. References to
            &ldquo;we&rdquo;, &ldquo;us&rdquo; and &ldquo;the Maison&rdquo;
            refer to GZAF Maison; &ldquo;you&rdquo; refers to the client
            placing the order.
          </p>
        </Section>

        <Section n="02" title="Eligibility">
          <p>
            You must be at least 18 years old and legally able to enter a
            binding contract in Egypt in order to purchase from the Maison.
            By placing an order you confirm that the information you provide
            is accurate and complete.
          </p>
        </Section>

        <Section n="03" title="Orders & acceptance">
          <p>
            Placing an order is an offer to purchase. The contract is
            concluded once the Maison confirms your order. We may refuse or
            cancel an order if items are unavailable, if the pricing or
            product information contained a manifest error, or if we suspect
            fraud or abuse. A refusal will be communicated promptly and no
            payment is collected in advance.
          </p>
        </Section>

        <Section n="04" title="Prices & payment">
          <p>
            All prices are shown in Egyptian Pounds (EGP) and include any
            applicable taxes. Shipping fees, when charged, are shown at
            checkout before you confirm the order.
          </p>
          <p>
            Payment is exclusively{" "}
            <span className="text-paper">Cash on Delivery</span>: you settle
            the full amount in EGP to the courier at the moment of
            hand-over. No card, wallet, or bank data is collected on the
            site.
          </p>
        </Section>

        <Section n="05" title="Delivery">
          <p>
            The Maison ships within the Arab Republic of Egypt only.
            Estimated delivery windows are indicative; delays caused by the
            courier, force majeure, or an incorrect address are not the
            Maison&rsquo;s responsibility. If no one is available to
            receive the parcel after two attempts, the order may be
            returned to the atelier.
          </p>
        </Section>

        <Section n="06" title="Returns & exchanges">
          <p>
            Ready-to-wear pieces may be returned within{" "}
            <span className="text-paper">14 days</span> of delivery,
            provided they are unworn, unwashed, unaltered, with all tags
            attached and in their original packaging.
          </p>
          <p>
            Items marked as final sale, made-to-measure commissions, and
            personalised pieces cannot be returned or exchanged, except in
            the case of a manufacturing defect.
          </p>
          <p>
            To open a return, write to{" "}
            <a
              href="mailto:care@gzaf.eg"
              className="text-paper underline underline-offset-4 hover:text-couture-red"
            >
              care@gzaf.eg
            </a>{" "}
            with your order number. Return shipping is at the client&rsquo;s
            charge unless the piece arrived defective.
          </p>
        </Section>

        <Section n="07" title="Product presentation">
          <p>
            The Maison photographs every piece with the greatest possible
            fidelity. Minor variations of colour, texture and hand-finished
            detail are inherent to couture craftsmanship and are not
            considered defects.
          </p>
        </Section>

        <Section n="08" title="Account & conduct">
          <p>
            You are responsible for keeping your account credentials
            confidential and for any activity on your account. Abuse,
            fraudulent orders, scraping, or attempts to compromise the
            security of the platform will result in the immediate closure
            of the account and, where appropriate, legal action.
          </p>
        </Section>

        <Section n="09" title="Discount codes">
          <p>
            Promotional codes, including the welcome discount, may not be
            combined with other offers unless explicitly stated, are
            personal to the recipient, cannot be exchanged for cash, and
            may be withdrawn at any time.
          </p>
        </Section>

        <Section n="10" title="Intellectual property">
          <p>
            All content on the site — designs, photographs, texts, marks
            and the GZAF name — is the property of the Maison and is
            protected by Egyptian and international law. No reproduction,
            commercial use, or derivative work is permitted without prior
            written consent.
          </p>
        </Section>

        <Section n="11" title="Liability">
          <p>
            To the fullest extent permitted by law, the Maison&rsquo;s
            liability in connection with any order is limited to the amount
            paid for that order. The Maison is not liable for indirect or
            consequential losses.
          </p>
        </Section>

        <Section n="12" title="Governing law">
          <p>
            These terms are governed by the laws of the Arab Republic of
            Egypt. Any dispute is subject to the exclusive jurisdiction of
            the competent Egyptian courts.
          </p>
        </Section>

        <Section n="13" title="Contact">
          <p>
            GZAF Maison — Cairo, Egypt. <br />
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
