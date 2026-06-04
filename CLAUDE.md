# CLAUDE.md — KaziPay Project Context

## What is KaziPay?

KaziPay is a business management platform built specifically for Kenyan creatives (graphic designers, photographers, videographers, illustrators, copywriters) that handles the entire client-to-payment journey.

**Core promise:** "Get the project formalised, get paid, and have proof of everything."

**The problem it solves:** Kenyan creatives consistently lose money because there is no formal structure between agreeing on a project and getting paid. Clients don't feel financially or legally committed, and creatives have no professional tool built for their context — one that works with M-Pesa, speaks their language, and removes the awkwardness of chasing payment.

**No direct local competitor exists.** The current creative workflow in Kenya is a messy combo of Google Docs for proposals, WhatsApp for client confirmation, manual eTIMS for invoices, M-Pesa for payment, and prayer for follow-up. KaziPay replaces that entire stack.

---

## How It Works (User Flow)

**Account setup (one-time, takes about a minute):**

- **Sign up** with just name, email, password — registration is *not* a survey
- **Verify email** — required before sign-in works. Click the link in the email; we land you on the sign-in page once verified.
- **Onboarding wizard** (4 steps right after first sign-in):
  1. **Profile** — profession + city
  2. **Business** — business name (prefilled from full name, since most are sole proprietors)
  3. **Brand** — optional KRA PIN + business address (skippable)
  4. **Plan** — pick Free, Single Project (KES 499 one-time), or Pro (KES 299/month). Paid plans set your tier but don't bill until M-Pesa lands in Phase 3.
- Logo + signature live in Settings (not onboarding) so the entry funnel stays fast.

**The project-to-payment loop (what the product actually does):**

1. Creative describes their project → KaziPay AI generates all professional documents instantly
2. Creative selects which documents to generate (not everything auto-generated)
3. Client receives a WhatsApp or email link → reviews documents → signs digitally (type-to-sign)
4. Deposit requested before work begins (via M-Pesa)
5. Work tracked through deliverables
6. Invoice auto-generated on delivery
7. Payment tracked and reminders sent automatically

---

## Two Project Entry Points

1. **"I already have the project"** — skip proposal, go straight to documents (Agreement phase). The Proposal tab does NOT exist for this project.
2. **"I'm sending a proposal first"** — proposal generated, creative reviews and sends it, client accepts, then the rest of the flow unlocks.

---

## Project Phases

### If proposal is skipped:
```
Agreement → Deposit → Work → Delivery → Invoice → Paid
```

### If proposal is sent first:
```
Proposal → Agreement → Deposit → Work → Delivery → Invoice → Paid
```

### Phase detail:

**Phase 1 — Proposal** (optional)
`Draft → Sent → Accepted`

**Phase 2 — Agreement**
`Documents generated → Previewed → Signed → Deposit paid`

**Phase 3 — Delivery**
`Work → Delivered → Invoiced → Paid`

Each phase only becomes visible when the previous one is complete. The creative only sees what's relevant right now.

---

## Document Library (12 documents total)

All documents are AI-generated from the project description. The creative selects which ones to generate — the tool never auto-generates everything.

### Before work begins (7)
- **Proposal** — pitching for the project
- **Quotation** — price breakdown (recommended default ✓)
- **Scope of Work** — what is and isn't included (recommended default ✓)
- **Contract / Service Agreement** — legal agreement (recommended default ✓)
- **NDA** — when client requires confidentiality
- **Letter of Engagement** — for corporate/NGO clients
- **Creative Brief** — client defines what they want clearly

### During the project (2)
- **Change Order** — when client asks for extras (must be signed before extra work begins)
- **Deposit Receipt** — proof of payment received (recommended default ✓)

### Closing the project (3)
- **Invoice** — auto-generated on delivery (recommended default ✓)
- **Final Delivery Note** — proof the work was delivered
- **Project Completion Certificate** — client signs off that project is done

### Document Selection UX
- Documents grouped by phase with checkboxes
- Recommended defaults pre-selected (Quotation, Scope of Work, Contract, Deposit Receipt, Invoice)
- Brief one-line descriptions under each document
- Smart suggestions based on client type (e.g., corporate client → nudge NDA + Letter of Engagement)

---

## Pricing Tiers

### Free — KES 0
- 1 active project at a time
- 3 document types only: Quotation, Scope of Work, Contract
- KaziPay branding/watermark on all documents (not the creative's own logo)
- No custom signature upload
- No payment reminders
- No project history beyond 30 days
- Basic features only

### Single Project — KES 499 one-time
- Everything unlocked for 1 project only
- All 12 documents
- Own logo, custom signature
- Permanent record of that project

### Pro — KES 299/month
- Unlimited projects
- All 12 documents
- Own logo upload
- Custom signature
- AI payment reminders
- Full project history
- Priority support

**Strategy notes:**
- KES 299 is positioned as a launch/early adopter price with room to increase later
- Free tier watermark acts as organic marketing ("Powered by KaziPay")
- Discounted yearly plan available

---

## Design System

| Token | Value |
|-------|-------|
| Background (dark) | `#141414` |
| Lime green accent | `#D4F53C` |
| Purple accent | `#8B5CF6` |
| Font | Manrope (all weights) |
| Layout | No sidebar — top nav only |
| Client-facing screens | Light mode |
| Creative-facing screens | Dark mode |
| Cards | Project cards layout on dashboard |

**Tone of voice:** Direct, confident, warm. Speaks to the Nairobi creative who is talented but getting burned by clients. Not corporate. Not generic SaaS. Local and real.

---

## Key Product Decisions

- **Single flow** — proposal is an optional toggle within the same flow, not a separate product path
- **M-Pesa** for payments (Kenyan context)
- **WhatsApp + Email** for sending documents to clients
- **Type-to-sign** digital signing (client types name, renders as signature)
- **Creative adds logo + signature** to all documents via brand settings
- **Document preview + edit** before sending to client
- **eTIMS** — built in the background from day one, hidden from users at launch, introduced later as a Pro feature ("we handle your compliance for you")
- Activity feed and banners say "kazipay generates" — NOT "AI generates"
- **Demo profile** used during development: Rowlex Karimi, graphic designer, Nairobi, Kenya, KES currency

---

## Dashboard UX

- Projects show their current phase clearly:
  - *"Luxe Nails — Proposal sent · Awaiting response"*
  - *"Madison Inv. — Agreement phase · Awaiting deposit"*
  - *"CCSA — Delivery phase · 3/5 deliverables done"*
- Empty/zero-project state explains the tool and gets new users started immediately
- Brand settings screen for logo + signature upload

---

## Client-Facing View

The client receives a WhatsApp or email link that opens a light-mode screen with:
- Sender card (creative's info)
- Project summary
- Reading progress tracker
- Expandable documents with proper formatting
- Locked signature that unlocks after all docs are read
- Confirmation screen after signing

---

## Existing Prototype Files

Three HTML prototypes have been built (standalone, all CSS/JS inline):

1. **`kazipay_prototype.html`** — Full creative dashboard and tool
   - Dashboard, new project wizard (3-step: client info → project details → payment terms)
   - Project detail with phase-based navigation
   - Projects list, settings, brand settings

2. **`kazipay_client.html`** — Client-facing sign-off screen
   - Sender card, project summary, reading progress tracker
   - 4 expandable documents with proper formatting
   - Locked signature (unlocks after all docs read)
   - Confirmation screen

3. **`kazipay_landing.html`** — Marketing landing page
   - Hero with pain-point copy
   - How it works section
   - Document library showcase
   - Features grid
   - Pricing cards (3 tiers)
   - Testimonials
   - Scroll-triggered animations, fully responsive

---

## Target Users

**Primary:** Freelance creatives in Kenya — graphic designers, photographers, videographers, illustrators, copywriters

**The client on the other side:** SMEs, corporate/brand clients, individuals (weddings, personal projects), NGOs

**Target creative profile:** Young, talented Nairobi-based creative who is good at their craft but has no formal business structure. Gets burned by clients who ghost, delay payment, or expand scope without paying more.

---

## Technical Notes for Building

- Currency is always **KES** (Kenyan Shillings)
- M-Pesa integration is core to the payment flow
- WhatsApp integration for sending documents is essential
- The product should feel Kenyan-first — not a Western SaaS reskinned
- Swahili can be used naturally in copy and UI where appropriate
- Mobile responsiveness is critical (most Kenyan creatives access from phones)
- No CDN dependencies for icons — use inline SVGs
- Documents are generated by AI from the project description — the creative never starts from a blank page

---

## What NOT to Build

- No general business document generator (only transaction documents between creative and client)
- No marketing materials or brand strategy templates
- No navigation that links between prototype files (they're separate)
- No backend/login in prototypes (frontend only for now)
- No eTIMS-related UI at launch (build backend support, hide from users)
