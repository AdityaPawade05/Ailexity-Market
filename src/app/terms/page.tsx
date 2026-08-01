import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — Ailexity Market",
  description: "The terms and conditions governing use of Ailexity Market.",
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-zinc-700">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">Terms of Service</h1>
      <p className="text-sm text-zinc-500 mb-10">Last updated: June 4, 2026</p>

      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">1. Acceptance</h2>
          <p>
            By creating an account or using Ailexity Market (&quot;the Platform&quot;), you
            agree to these Terms of Service. If you do not agree, do not use the
            Platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">2. Eligibility</h2>
          <p>
            You must be at least 16 years old to use the Platform. By registering you
            represent that you meet this requirement and that the information you provide
            is accurate.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">3. Accounts</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You are responsible for keeping your password confidential.</li>
            <li>
              You are responsible for all activity that occurs under your account.
            </li>
            <li>
              Notify us immediately at{" "}
              <a href="mailto:support@ailexity.market" className="text-amber-600 hover:underline">
                support@ailexity.market
              </a>{" "}
              if you suspect unauthorised access.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">4. Sellers</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              You must own or have the rights to sell any digital product you list.
            </li>
            <li>
              Products must not infringe intellectual property rights or contain
              illegal, deceptive, or harmful content.
            </li>
            <li>
              You are responsible for the accuracy of product descriptions and the
              delivery of purchased products to buyers.
            </li>
            <li>
              We reserve the right to remove products or suspend accounts that violate
              these terms.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">5. Buyers</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              You may request a refund within 14 days of purchase from your Library.
              Refund requests are reviewed by the seller (or Ailexity), and approved
              refunds return the full purchase price to your wallet and revoke access
              to the content. Outside the 14-day window, refunds are at the
              seller&apos;s discretion.
            </li>
            <li>
              Digital products are licensed for personal use only unless stated
              otherwise by the seller. You may not redistribute or resell purchased
              content.
            </li>
            <li>
              Attempting chargebacks for legitimate purchases may result in account
              suspension.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">6. Prohibited Conduct</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Post illegal, abusive, defamatory, or fraudulent content.</li>
            <li>Impersonate another person or entity.</li>
            <li>Scrape, harvest, or automatically collect data from the Platform.</li>
            <li>
              Attempt to gain unauthorised access to any part of the Platform or its
              infrastructure.
            </li>
            <li>Use the Platform to distribute spam or malware.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">7. Intellectual Property</h2>
          <p>
            The Platform and its original content (logos, design, code) are the
            exclusive property of Ailexity Market. User-generated content (posts,
            products) remains the property of the user; by posting it you grant us a
            limited licence to display and distribute it within the Platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">8. Disclaimers</h2>
          <p>
            The Platform is provided &quot;as is&quot; without warranties of any kind. We do not
            guarantee the accuracy of seller content or the uninterrupted availability
            of the Platform.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">9. Limitation of Liability</h2>
          <p>
            To the fullest extent permitted by law, Ailexity Market shall not be liable
            for indirect, incidental, or consequential damages arising from your use of
            the Platform, including disputes between buyers and sellers.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">10. Termination</h2>
          <p>
            We may suspend or terminate your account at any time for violation of these
            Terms. You may delete your account at any time from your profile settings.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">11. Changes</h2>
          <p>
            We may revise these Terms at any time. Material changes will be communicated
            by email. Continued use of the Platform constitutes acceptance of the
            revised Terms.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">12. Contact</h2>
          <p>
            Questions?{" "}
            <a
              href="mailto:support@ailexity.market"
              className="text-amber-600 hover:underline"
            >
              support@ailexity.market
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
