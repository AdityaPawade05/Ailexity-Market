import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Ailexity Market",
  description: "How Ailexity Market collects, uses, and protects your personal data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12 text-zinc-700">
      <h1 className="text-3xl font-bold text-zinc-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-zinc-500 mb-10">Last updated: June 4, 2026</p>

      <section className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">1. Who We Are</h2>
          <p>
            Ailexity Market (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the digital
            marketplace available at ailexity.market. We facilitate the sale and
            purchase of digital products including ebooks, online courses, and SaaS
            tools.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong>Account information:</strong> Name, email address, and password
              (stored hashed) when you register.
            </li>
            <li>
              <strong>Profile information:</strong> Optional avatar, bio, location, and
              social links you provide.
            </li>
            <li>
              <strong>Transaction data:</strong> Records of purchases you make or sales
              you receive, including amounts and timestamps.
            </li>
            <li>
              <strong>Content:</strong> Posts, comments, and products you create on the
              platform.
            </li>
            <li>
              <strong>Usage data:</strong> Standard server logs (IP address, browser
              type, pages visited) for security and analytics.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To create and maintain your account.</li>
            <li>To process purchases and deliver digital products.</li>
            <li>To send transactional emails (receipts, password resets).</li>
            <li>To display your public profile and content to other users.</li>
            <li>To detect and prevent fraud and abuse.</li>
            <li>To improve the platform through aggregated analytics.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">4. Data Sharing</h2>
          <p>
            We do not sell your personal data. We share it only with:
          </p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>
              <strong>Service providers</strong> who help us operate the platform
              (hosting, email delivery, payment processing) under strict data-processing
              agreements.
            </li>
            <li>
              <strong>Sellers</strong> when you purchase their product — they receive
              your name and email to fulfil the order.
            </li>
            <li>
              <strong>Law enforcement</strong> when required by applicable law or to
              protect the rights and safety of our users.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">5. Cookies</h2>
          <p>
            We use a single HTTP-only authentication cookie to keep you logged in. We do
            not use third-party tracking or advertising cookies.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">6. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. You may
            request deletion of your account and associated data at any time by emailing
            us. Some data (e.g. transaction records) may be retained for legal and
            accounting purposes for up to 7 years.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">7. Your Rights</h2>
          <p>
            Depending on your jurisdiction you may have the right to access, correct,
            export, or delete your personal data. To exercise any of these rights,
            contact us at{" "}
            <a
              href="mailto:privacy@ailexity.market"
              className="text-amber-600 hover:underline"
            >
              privacy@ailexity.market
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">8. Security</h2>
          <p>
            We use industry-standard measures including encrypted connections (HTTPS),
            hashed passwords, and HTTP-only cookies. No method of transmission over the
            internet is 100% secure, and we cannot guarantee absolute security.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">9. Changes to This Policy</h2>
          <p>
            We may update this policy periodically. We will notify registered users by
            email of material changes. Continued use of the platform after changes
            constitutes acceptance.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-3">10. Contact</h2>
          <p>
            Questions about this policy? Email{" "}
            <a
              href="mailto:privacy@ailexity.market"
              className="text-amber-600 hover:underline"
            >
              privacy@ailexity.market
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
