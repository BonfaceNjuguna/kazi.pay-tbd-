# CI & Security

> What runs automatically, when, why, and how to read failures.

KaziPay uses GitHub Actions for CI and security scanning. Everything is configured in `.github/workflows/` and `.github/dependabot.yml`. This page documents what's there and how to act on it.

For the branch-protection rules that **enforce** these checks against the trunk, see [`main-branch-protection.md`](./main-branch-protection.md).

---

## Workflows at a glance

| Workflow | File | Trigger | Blocks merge? |
|----------|------|---------|---------------|
| **CI** (lint, typecheck, test, build) | `.github/workflows/ci.yml` | PR/push to `main` touching code | ✅ |
| **Docker Build** | `.github/workflows/docker.yml` | PR/push touching Dockerfiles or compose files | ✅ (once Dockerfiles exist) |
| **CodeQL** | `.github/workflows/codeql.yml` | Every PR/push to `main` + weekly Mon 06:00 UTC | ✅ |
| **Gitleaks** | `.github/workflows/gitleaks.yml` | Every PR/push to `main` | ✅ |
| **Dependabot** | `.github/dependabot.yml` | Weekly Mon 06:00 EAT | n/a — opens PRs |
| **PR template** | `.github/pull_request_template.md` | Every PR | Checklist enforcement is honour-system |

---

## CI — lint, typecheck, test, build

`.github/workflows/ci.yml` runs four jobs in parallel:

| Job | Command | Why |
|-----|---------|-----|
| `Lint` | `pnpm lint` | ESLint with `--max-warnings 0`. Warnings are errors. |
| `Typecheck` | `pnpm typecheck` | `tsc --noEmit` with `noUncheckedIndexedAccess` and other strict options enabled |
| `Test` | `pnpm test` | Vitest, single run. Each workspace's tests run via `pnpm -r test`. |
| `Build` | `pnpm build` | Type-checks then produces a Vite production bundle |

**Triggers:** every PR to `main` and every push to `main`. **No paths filter** — see the workflow file's header comment for why. Briefly: branch protection marks these jobs as required, and a `paths`-filtered required check deadlocks any PR that doesn't match the paths ("Expected — Waiting for status to be reported" forever). Running ~2–3 minutes of CI on docs-only PRs is cheaper than un-mergeable PRs.

**Skips:** nothing is skipped at the workflow level. If a future optimization is needed for genuinely doc-only PRs, the right pattern is a "sentinel job" that always runs and reports success, with the expensive jobs gated on a path-change check — and branch protection requiring only the sentinel.

**Concurrency:** in-progress runs are cancelled when a new commit lands on the same branch. Saves CI minutes during iterative pushes.

**Permissions:** workflows run with `contents: read` only. No write access to the repo, no token leakage surface.

### Common failures and fixes

- **Lockfile out of sync.** `pnpm install --frozen-lockfile` fails when a `package.json` was edited without re-running `pnpm install`. → Locally `pnpm install` and commit the updated `pnpm-lock.yaml`.
- **Lint errors.** `--max-warnings 0` means warnings = errors. → Fix the warnings; don't bump the threshold. If a warning is genuinely wrong for a case, add a targeted `// eslint-disable-next-line <rule>` with a comment explaining why.
- **Type errors from `noUncheckedIndexedAccess`.** `array[0]` is `T | undefined`. → Handle the `undefined` case; don't add `!`.
- **Test failures only in CI.** Usually timezone or locale dependence. → Set `TZ=Africa/Nairobi` in the failing test or freeze time with `vi.setSystemTime`.

---

## Docker Build

`.github/workflows/docker.yml` builds the frontend and backend Docker images without pushing them. Validates the Dockerfile, the build context, and `.dockerignore`.

**Triggers:** PR/push to `main` touching `frontend/Dockerfile`, `frontend/.dockerignore`, `frontend/nginx.conf`, `backend/Dockerfile`, `backend/.dockerignore`, `docker-compose.yml`, or `docker-compose.dev.yml`.

**Per-image guards:** each job checks `hashFiles('<path>/Dockerfile') != ''` at **step level** (after checkout — `hashFiles` cannot be evaluated at job level since the workspace isn't checked out yet). Until Phase 1.2 lands the Dockerfiles, the build steps are skipped and the job emits a `::notice::` explaining why; the job still ends green so branch protection sees it pass.

**Caching:** uses GitHub Actions cache scoped per image. First build is slow; subsequent builds re-use layers.

---

## CodeQL — weekly + per-PR static analysis

`.github/workflows/codeql.yml` runs GitHub's CodeQL analyzer with the **`security-and-quality`** query set against all JavaScript/TypeScript in the repo.

**Triggers:** every PR to `main`, every push to `main`, plus a weekly cron (Mon 06:00 UTC = 09:00 EAT).

**Why this matters specifically for KaziPay:**
- **AI-generated HTML rendered on the client share page** is the highest-priority XSS surface. CodeQL catches sanitization gaps.
- **M-Pesa callback handling** must validate every field. CodeQL flags missing checks on parsed callback payloads.
- **Signing audit-hash code** must use a known-safe hash construction (no string concatenation of untrusted input into HMAC input). CodeQL catches the common mis-patterns.
- **Hardcoded secrets** in source — caught by CodeQL's secret rules.

Findings appear under **Security → Code scanning** in the GitHub UI. Triage weekly:
- Fix true positives in a new PR.
- Dismiss false positives with a written justification (it's recorded in the audit trail).

---

## Gitleaks — per-PR secret scan

`.github/workflows/gitleaks.yml` scans every PR and push to `main` for accidentally committed secrets using [gitleaks](https://github.com/gitleaks/gitleaks).

**Triggers:** every PR to `main`, every push to `main`.

**What it catches:** AWS keys, GitHub tokens, GCP service-account JSON, generic high-entropy strings, private keys, JWT secrets, and many provider-specific formats. Custom patterns (e.g. for M-Pesa-style consumer keys) can be added by dropping a `.gitleaks.toml` at the repo root.

**Note on licensing:**
- Free for personal accounts and **public** repos.
- For **org-owned private repos**, gitleaks-action requires a license. Set the key as a repo secret named `GITLEAKS_LICENSE` and uncomment the matching line in `.github/workflows/gitleaks.yml`.

### If gitleaks flags a real secret

1. **Do not push more commits to "fix" it.** The secret is already in git history; another commit doesn't help.
2. **Rotate the secret immediately** at the provider (Safaricom Daraja portal, WhatsApp Business, AI provider, etc.).
3. **Scrub the history.** Coordinate with the team — this is a force-rewrite of a shared branch:
   ```bash
   # Install git-filter-repo first.
   git filter-repo --replace-text <(echo "leaked-value==>REMOVED")
   git push --force-with-lease origin <branch>
   ```
4. **Re-add the new secret** as a GitHub repo Secret (Settings → Secrets and variables → Actions). Never as a committed file.

---

## Dependabot

`.github/dependabot.yml` opens weekly PRs for dependency updates.

**Ecosystems monitored:**

| Ecosystem | Directory | Activates when |
|-----------|-----------|----------------|
| `npm` | `/` | Root tooling (prettier, typescript) — already active |
| `npm` | `/frontend` | Phase 1.7 merged — already active |
| `npm` | `/backend` | Phase 1.6 — when backend ships |
| `github-actions` | `/` | Already active — keeps `uses: ...` references current |
| `docker` | `/frontend` | Phase 1.2 — when frontend Dockerfile lands |
| `docker` | `/backend` | Phase 1.2 — when backend Dockerfile lands |

**Schedule:** Monday 06:00 Africa/Nairobi (start of work week).

**Grouping:** patch + minor updates per ecosystem are bundled into a **single weekly PR** to reduce review fatigue. Major version bumps come as individual PRs because they may need code changes.

**Limits:** up to 10 open PRs per npm ecosystem, 5 for github-actions, 3 for docker. Prevents the queue from exploding if a week's updates aren't reviewed.

### Triage Dependabot PRs

1. Read the changelog/release-notes link in the PR description.
2. If CI is green, merge patch + minor updates immediately.
3. For major bumps: read the migration guide, run locally, fix what breaks, then merge.
4. CVE-flagged updates show a security badge — prioritise those.

**Don't sit on Dependabot PRs.** A stale Dependabot PR is a Dependabot PR that's about to conflict with the next one.

---

## What the PR template enforces

`.github/pull_request_template.md` pre-populates every new PR with a checklist that mirrors the Coding Standards and Documentation Rules in `AGENTS.md`. The template is honour-system — humans tick the boxes — but it surfaces the rules at the moment of merge so they aren't forgotten.

If a rule is consistently being skipped, escalate to either:
- An ESLint rule (for code), or
- A `danger.js` rule (for PR metadata), or
- A new required CI check (most enforceable).

---

## CODEOWNERS

`.github/CODEOWNERS` is currently a commented-out placeholder. Once roles are assigned, uncomment the relevant rules and assign owners.

Once owners are matched, you can enable **Require review from Code Owners** in branch protection — see [`main-branch-protection.md`](./main-branch-protection.md).

---

## What's deliberately not enforced (yet)

These are valid future additions; we haven't added them because each carries a real cost (CI minutes, review fatigue, false-positive triage). Add when there's a concrete trigger.

| Future check | Trigger to add |
|--------------|----------------|
| Bundle-size budgets (`< 180KB` creative / `< 80KB` client) | Phase 4.5 prep — see milestone DoD |
| Accessibility (axe / pa11y) | Phase 1.9 once real screens exist |
| Visual regression (Chromatic / Percy) | Only if visual bugs become a recurring complaint |
| Playwright E2E | Phase 4.4 deliverable |
| `npm audit --audit-level=high --production` as a blocking check | Only if Dependabot security PRs are routinely ignored |

---

## Manual emergency overrides

For genuinely-urgent production hotfixes:

- **Skip a single CI run:** add `[skip ci]` to the commit message. **Don't** use this to merge unreviewed code — see the branch-protection guide for the proper hotfix procedure.
- **Re-run a flaky check:** comment `/recheck` on the PR (only works if you've added the recheck action — we haven't). Otherwise, click "Re-run failed jobs" in the Actions tab.
- **Temporarily relax branch protection:** never. Use the hotfix procedure in [`main-branch-protection.md`](./main-branch-protection.md#if-something-goes-wrong) instead.
