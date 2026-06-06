# Vision Register

> Single source of truth for every product vision's lifecycle.
> Whenever a vision is added, changed, converted into a milestone, started, shipped, or descoped — update this file.
> Detailed vision documents live in `docs/visions/`. This file is the changelog and index.

**Last Updated:** 2026-05-30

---

## States

| State | Meaning |
|-------|---------|
| `proposed` | Documented as a vision but no milestone exists yet. |
| `milestoned` | Has been converted into one or more entries in `docs/milestones/`. Not yet being built. |
| `in-progress` | Active implementation against the milestone scope. |
| `shipped` | Live in production. Linked to the milestone document where it was completed. |
| `deprecated` | Explicitly decided not to build (or to stop building). Reason recorded. |

---

## Active Visions

### Foundational

| Vision | State | Source | Milestone(s) | Notes |
|--------|-------|--------|-------------|-------|
| Perxli core loop — formalise → get paid → proof | `milestoned` | [`docs/visions/product-vision.md`](visions/product-vision.md) | `phase-1`, `phase-2`, `phase-3`, `phase-4` | The whole product. Decomposed across all four phases of the dev roadmap. |

### Phase 4 candidates (committed scope but flagged)

| Vision | State | Source | Milestone(s) | Notes |
|--------|-------|--------|-------------|-------|
| eTIMS as a Pro feature | `milestoned` (backend hidden) | [`docs/visions/future-features.md`](visions/future-features.md#etims-as-a-pro-feature-we-handle-your-compliance) | `phase-4` (§4.1) | Backend payload generation built in Phase 4 but submission and UI explicitly hidden. The "we handle your compliance for you" Pro upsell is a later vision still tagged `proposed`. |

### Proposed (no milestone yet)

| Vision | State | Source | Notes |
|--------|-------|--------|-------|
| eTIMS Pro upsell UI | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#etims-as-a-pro-feature-we-handle-your-compliance) | UI surface for the eTIMS toggle, compliance dashboard, monthly report. Needs design + pricing decision before milestoning. |
| Group project mode (studios & collectives) | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#group-project-mode-studios--collectives) | Multi-collaborator projects with per-collaborator M-Pesa payout splits. Significant schema change to `projects` and `payments`. |
| Client history / trusted clients | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#client-history--trusted-clients) | Surface repeat-client metrics on the dashboard. Low backend lift, but UX needs thought. |
| Industry-specific document templates | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#industry-specific-templates) | Per-discipline variants (graphic design, photography, videography, etc.). Depends on real usage data from launch. |
| WhatsApp-first inbound (Perxli bot) | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#whatsapp-first-inbound) | Start a project by messaging a Perxli WhatsApp bot. High-impact for low-friction onboarding. |
| Mobile app (creative-facing) | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#mobile-app-creative-facing) | React Native app for push notifications, camera capture, offline drafts. Web is mobile-responsive already. |
| Pan-East-African expansion | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#pan-east-african-expansion) | Uganda → Tanzania → Rwanda. Requires `PaymentProvider` abstraction generalised beyond M-Pesa Kenya. |
| AI negotiation assist | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#ai-negotiation-assist) | AI-drafted replies to scope creep, late payment, kill fees. Builds on the Phase 3 reminders engine. |
| Creative discovery / marketplace | `proposed` (cautious) | [`docs/visions/future-features.md`](visions/future-features.md#creative-discovery--marketplace-cautious) | Explicitly flagged as long-range. Changes product from tool → marketplace. |
| Earned-project lending | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#earned-project-lending) | Advance against signed-contract value. Requires lender partnership + regulatory work. |
| White-label / API-only mode | `proposed` | [`docs/visions/future-features.md`](visions/future-features.md#white-label--api-only-mode) | B2B2B distribution. Requires stable public API surface (Phase 4 internal API needs hardening first). |

### In-Progress

_None yet._

### Shipped

_None yet._

### Deprecated

_None yet._

---

## How to update this file

When you do any of the following, add a line here in the **Changelog** below and update the relevant table above:

- Add a new vision to `docs/visions/` → register as `proposed`
- Convert a vision into milestone(s) → move to `milestoned`, link the milestone files
- Start work → move to `in-progress`, link the PR / commit
- Finish work end-to-end → move to `shipped`, link the milestone-doc entry where it was completed
- Drop a vision → move to `deprecated` with a one-line reason

Keep the changelog terse — dates, vision name, state change, one-line reason. Detail goes in the vision document or ADR.

---

## Changelog

| Date | Vision | Change | Reason / Link |
|------|--------|--------|---------------|
| 2026-05-30 | Perxli core loop | initial → `milestoned` | Initial roadmap split across Phases 1–4. See `docs/dev-roadmap.md`. |
| 2026-05-30 | eTIMS as a Pro feature | initial → `milestoned` (backend only) | Phase 4 §4.1 builds the payload pipeline; submission + UI deferred. |
| 2026-05-30 | All other future-features.md items | initial → `proposed` | Documented in `docs/visions/future-features.md`, not yet milestoned. |
