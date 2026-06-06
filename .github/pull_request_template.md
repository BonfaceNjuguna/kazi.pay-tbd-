<!--
Perxli PR template.

Title format (conventional commits — see AGENTS.md § Git Commit Format):
  feat(scope): short imperative description
  fix(scope): ...
  docs(scope): ...
  chore(scope): ...

The Branching & Workflow rule in AGENTS.md is the spec. This template is the
checklist for it.
-->

## Summary

<!-- 1-3 bullets: what this PR changes and why. The "why" matters more than the "what". -->

-
-

## Phase / Milestone

<!--
Link to the active milestone, e.g.:
  - `docs/milestones/phase-1-foundation.md` §1.8 — Auth UI
  - `docs/vision-register.md` → vision moved to `in-progress`
-->

## Workflow checklist

- [ ] Branched off a freshly-pulled `main` (per **Branching & Workflow** in `AGENTS.md`)
- [ ] PR title and commit messages use conventional-commits format (`feat(scope): ...`)
- [ ] Branch name follows the prefix convention (`feature/` · `fix/` · `docs/` · `chore/` · `refactor/`)
- [ ] No frontend-only enforcement of backend rules (per **Cross-Surface Rules** in Coding Standards)
- [ ] No new pattern introduced without an ADR
- [ ] No new dependencies without justification

## Tests

- [ ] Tests added/updated for the change
- [ ] If applicable, the non-negotiable areas are covered: permissions, phase transitions, signature hashing, payment reconciliation, integrations, free-tier gating (see Coding Standards → **What Must Have Tests**)
- [ ] CI is green (lint, typecheck, test, build, gitleaks, codeql)

## Documentation (per **Documentation Rules** in `AGENTS.md`)

- [ ] `docs/dev-roadmap.md` milestone status updated (⬜ → 🟡 or 🟡 → 🟢)
- [ ] Relevant milestone doc updated with implementation notes (file paths, decisions, gotchas)
- [ ] New ADR in `docs/decisions/` if a significant architecture/product decision was made
- [ ] `docs/vision-register.md` updated if a vision's state changed
- [ ] `CLAUDE.md` updated if product context shifted (pricing, doc library, design tokens, demo profile, "what NOT to build")

## Test plan

<!--
How a reviewer verifies this works. Be specific. For UI changes, screenshots
or short screen recordings are welcome.
-->

-
-

## Breaking changes

<!--
- API: did response shape, status code, or auth boundary change? If yes,
  follow ADR-004 (version bump).
- DB: did a migration land? Is it forward-only safe? Was data backfilled?
- Frontend: did a hook or component contract change?
-->

None / [describe]

## Related issues / PRs

<!-- `Closes #123`, `Depends on #456`, `Follows #789`, etc. -->
