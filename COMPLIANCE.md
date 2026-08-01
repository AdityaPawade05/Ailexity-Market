# Going Live with Real Money — Compliance Roadmap

> This document is an engineering-side map of the legal/regulatory work needed
> before Ailexity Market handles real money. It is **not legal advice** — before
> launch, have a lawyer familiar with payments in your operating jurisdiction
> review the plan.

## Where the app stands today

The wallet system is **closed-loop demo money**: deposits credit a database
number without charging anyone, and withdrawals debit it without paying anyone.
No real funds move, so today there is no money-transmission activity — and no
licensing exposure. The moment a real payment processor is wired in, that
changes, and the sections below apply.

## The one decision that shapes everything: who holds the money?

A marketplace that **holds sellers' balances itself** (custodial wallet, like
the current demo design) is, in most jurisdictions, doing regulated money
transmission — in the US that means state-by-state money-transmitter licenses
(MTLs) plus FinCEN registration; in the EU an e-money/PSD2 authorization; in
India an RBI Payment Aggregator license. Getting licensed takes years and
serious capital. **Almost no small marketplace does this.**

The standard alternative is the **payment-facilitator model**: a licensed
processor holds the funds and pays sellers out directly, and the platform never
touches the money. The processor also takes over the hardest compliance work:

| Obligation | Who handles it under the facilitator model |
|---|---|
| Money-transmitter licensing | The processor (they're the licensed entity) |
| KYC / seller identity verification | Processor's hosted onboarding (e.g. Stripe Connect onboarding flow) |
| AML monitoring / sanctions screening | Processor |
| Card-network compliance (PCI-DSS) | Processor (the app never sees card numbers) |
| US tax forms (1099-K) for sellers | Stripe/PayPal issue these directly |
| Chargebacks / dispute handling | Processor tooling, platform sets policy |

### Concrete provider options

- **Stripe Connect** (global; the default choice) — "destination charges" or
  "separated charges & transfers" map exactly to this app's 90/10 split:
  buyer pays → Stripe splits → seller's connected account gets 90%, platform
  fee 10%. Sellers onboard through Stripe's hosted KYC flow. Refunds reverse
  through the same rails, replacing the wallet-reversal logic.
- **PayPal Commerce Platform** — same idea, wider consumer familiarity, weaker
  developer ergonomics.
- **Razorpay Route or Cashfree Easy Split** (if operating from India) — the
  domestic equivalents of Stripe Connect; RBI-licensed aggregators that handle
  split settlements, seller KYC, and payouts to Indian bank accounts.
- **Lemon Squeezy / Paddle (merchant-of-record)** — they become the legal
  seller, handling global sales tax/VAT too. Simplest compliance story of all,
  but their marketplace/multi-seller support is limited — a fit only if the
  product mix stays simple.

### What this means for the codebase

The integration replaces the *funding* edges of the wallet, not the app's
bookkeeping:

1. **Deposit** → becomes a Stripe Checkout/PaymentIntent (or Razorpay order).
   The wallet credit happens only in the payment-success webhook, never from
   client input. (The current `/api/wallet/deposit` accepting an arbitrary
   amount must be removed/gated before launch.)
2. **Withdraw** → becomes a payout/transfer to the seller's connected account.
3. **Purchase/refund split logic** (`splitPayment`, refund reversal) → either
   keeps running as internal ledger records that mirror processor transfers, or
   is delegated to the processor's split-payment primitives.
4. `WalletTransaction` stays — as the platform's **audit ledger**, now anchored
   to processor transaction IDs (add a `processorRef` column when integrating).

## Obligations that stay with the platform even under a facilitator

- **Terms of Service & Refund Policy** — must match what the software actually
  does (the in-app policy is: buyers may request a refund within 14 days;
  sellers/admins approve or decline; approved refunds restore the full price).
- **Privacy** — the app stores emails, purchase history, and messages. GDPR
  (EU users) and India's DPDP Act imply: a lawful basis for processing, data
  export/deletion on request, and breach notification. A `data deletion`
  admin path is a worthwhile future addition.
- **Content liability** — DMCA-style takedown handling for infringing product
  uploads (the admin unpublish/delete tooling built in this codebase is the
  enforcement mechanism; a public notice email address is the missing piece).
- **Seller tax support** — even where the processor issues tax forms, sellers
  need earnings data. The app provides a per-seller yearly earnings report
  (Payments page → "Earnings report" CSV: monthly gross/refunds/commission/net).
- **Record keeping** — the admin panel's transactions export provides the
  platform-side audit trail for accounting.

## Suggested sequencing

1. Pick the processor (Stripe Connect if operating outside India; Razorpay
   Route/Cashfree if India-based — decide based on where the legal entity and
   sellers' bank accounts are).
2. Form the legal entity + get the processor account approved (they review the
   marketplace model as part of onboarding).
3. Integrate: hosted seller onboarding, deposit → checkout, withdraw → payout,
   webhook-driven wallet credits, `processorRef` on `WalletTransaction`.
4. Remove/flag demo-money paths (`/api/wallet/deposit` free credit, the $100
   welcome bonus in `/api/wallet`).
5. Lawyer review of ToS/Privacy/Refund pages against the target jurisdiction.
6. Launch with the processor in test mode end-to-end first; their test cards
   exercise the same webhooks as production.
