# Future Features Vision

> These are directional ideas for Phase 4+ and beyond. Not committed scope.
> Before implementing anything here, create or reference an ADR and add it to a milestone.

---

## eTIMS as a Pro Feature ("We Handle Your Compliance")

Backend support for eTIMS is built from day one (every invoice produces an eTIMS-ready payload — see Phase 4). The public-facing product launch hides this entirely.

Later, eTIMS submission gets surfaced as a flagship Pro feature: **"KaziPay handles your KRA compliance for you."** One toggle in settings, every invoice from then on is auto-submitted to eTIMS, and the creative gets a clean monthly compliance report.

**Why this matters:** eTIMS is a real source of anxiety for Kenyan creatives — it's confusing, the official portals are clunky, and most creatives just don't do it. Removing it as a worry is a serious upsell.

---

## Group Project Mode (Studios & Collectives)

Many creatives work in small collectives — three friends running a photo studio, a duo doing brand identity work. KaziPay v1 is single-user. Future: allow a creative to invite collaborators to a project, each with their own scope of work and their own payout split via M-Pesa.

---

## Client History / "Trusted Clients"

Track repeat clients across projects. Show the creative how many projects they've done with a given client, how reliably that client paid, and average days-to-final-payment. Surfaces good and bad clients without anyone needing to keep a spreadsheet.

---

## Industry-Specific Templates

Phase 2 ships 12 generic document templates. Future: per-discipline variants tuned for graphic design (with brand asset deliverables sections), photography (with shoot day terms, image licensing), videography (with rounds-of-revisions clauses), etc.

---

## WhatsApp-First Inbound

Today the creative starts in the dashboard and the client receives a WhatsApp link. Future: allow the creative to start a project directly from WhatsApp by messaging a KaziPay bot — "new project, Madison Inv, branding, KES 80,000, 50% deposit" — and KaziPay generates the documents and sends them back as a link.

---

## Mobile App (Creative-Facing)

The current web app is mobile-responsive, but a real React Native app would enable push notifications for client signs and payments, camera access for receipts, and offline draft mode.

---

## Pan-East-African Expansion

The platform is built Kenya-first. Once the Kenya loop is repeatable, expand to Uganda (mobile money: MTN MoMo, Airtel Money) and Tanzania (M-Pesa Tanzania) without rewriting the engine. Each country gets its own integration module behind the same `PaymentProvider` interface.

**Priority order:** Kenya → Uganda → Tanzania → Rwanda.

---

## AI Negotiation Assist

Phase 3 ships AI payment reminders. Future: AI-drafted responses to common client situations — scope creep ("client just asked for two more revisions"), late payment ("client says they'll pay next week, again"), kill fees. The creative gets a recommended reply they can edit and send.

---

## Creative Discovery / Marketplace (Cautious)

A directory of KaziPay creatives surfaced to potential clients could be a strong distribution play — but it changes the product from a tool into a marketplace, and marketplaces have very different dynamics. This is explicitly **not** a near-term direction; flagged here only as a long-range option.

---

## Earned-Project Lending

Once a deposit is paid and a contract is signed, the rest of the project value is reasonably predictable income. A partner lender could advance the creative a portion of that against the signed contract. Requires regulatory work and lender partnerships; high-value but high-effort.

---

## White-Label / API-Only Mode

Allow other regional fintechs, freelance platforms, or co-working spaces to embed KaziPay's project-to-payment engine via API. They own the UX; KaziPay provides the document generation, signing, M-Pesa rail, and compliance as a service. Long-range B2B2B motion.
