# Main Branch Protection — Setup Guide

> **`main` is the holy grail.** This guide configures GitHub to **enforce** the **Branching & Workflow** rule from `AGENTS.md` at the platform level — no more honour-system.
>
> Do this once after the repo is created, and again any time the rules change.
> Requires **repo admin** permissions.

For what each check actually does, see [`ci-and-security.md`](./ci-and-security.md).

---

## Why branch protection?

The Branching & Workflow rule in `AGENTS.md` says "never commit to main directly." That rule lives on the trust system unless GitHub enforces it.

Branch protection makes the platform refuse:
- Direct `git push` to `main` from a developer machine
- Force-pushes to `main`
- Deleting `main`
- Merging a PR without required CI green
- Merging a PR without review

One accidental `git push origin main` after editing on the wrong branch can otherwise land unreviewed code on the trunk. Branch protection is what turns the rule from a wish into a guarantee.

---

## Step-by-step (GitHub web UI)

### 1. Open branch protection settings

1. Open the repo on GitHub.
2. **Settings → Branches** (left sidebar).
3. Under **Branch protection rules**, click **Add rule** (or **Edit** if the `main` rule already exists).

### 2. Branch name pattern

```
main
```

(No wildcards; we only protect `main`.)

### 3. Required settings — tick every item below

#### Require a pull request before merging

- ☑ **Require a pull request before merging**
  - ☑ **Require approvals** — set to **1** (bump to 2 once the team grows past 3 people)
  - ☑ **Dismiss stale pull request approvals when new commits are pushed** — stops "approved 3 commits ago" merges
  - ☑ **Require review from Code Owners** — only effective once `.github/CODEOWNERS` has real owners (currently a placeholder). Leave on; it's a no-op until owners are assigned.
  - ☐ **Restrict who can dismiss pull request reviews** — leave off
  - **Allow specified actors to bypass required pull requests** — leave list **empty**. Even admins follow the workflow.

#### Require status checks to pass before merging

- ☑ **Require status checks to pass before merging**
  - ☑ **Require branches to be up to date before merging** — forces rebasing `main` into the branch before merge so the PR diff reflects only your changes

  **Status checks that are required.** Search and add these (job names from our workflows):
  - `Lint` &nbsp;&nbsp; (from `CI`)
  - `Typecheck` &nbsp;&nbsp; (from `CI`)
  - `Test` &nbsp;&nbsp; (from `CI`)
  - `Build` &nbsp;&nbsp; (from `CI`)
  - `Scan for secrets` &nbsp;&nbsp; (from `Gitleaks`)
  - `Analyze javascript-typescript` &nbsp;&nbsp; (from `CodeQL`)

  Add once they exist (Phase 1.2):
  - `Build frontend image` &nbsp;&nbsp; (from `Docker Build`)
  - `Build backend image` &nbsp;&nbsp; (from `Docker Build`)

  > **Note:** a status check only appears in this dropdown **after it has run at least once** against any PR or push. If you don't see it, push a dummy change that triggers the workflow once.

  > ⚠ **Do NOT add these to required-checks** even though they show up in the dropdown:
  > - `.github/dependabot.yml` — GitHub's auto-generated Dependabot config validator. Only runs on PRs that touch `dependabot.yml`. Marking it required deadlocks every other PR ("Expected — Waiting for status to be reported" forever).
  > - `Build frontend image` / `Build backend image` (before Phase 1.2) — same reason, the workflow is path-filtered to Dockerfile changes.
  >
  > **Rule of thumb:** only mark a check as required if its workflow runs on **every** PR to main. Path-filtered workflows that are also required-checks will block PRs that don't match the paths. Our `CI` workflow deliberately has no paths filter for this reason — see `ci-and-security.md`.

#### Other merge rules

- ☑ **Require conversation resolution before merging** — every PR comment must be resolved before merge
- ☑ **Require signed commits** — recommended; set up commit signing via SSH or GPG on every developer machine
- ☑ **Require linear history** — disallows merge commits on `main`. Use **squash-merge** or **rebase-merge** from the PR UI. Keeps `git log` readable.
- ☐ **Require deployments to succeed before merging** — leave off until we have a staging environment (Phase 4)
- ☐ **Lock branch** — off. We do merge to `main`, just only via PRs.

#### Restrict pushes

- ☑ **Restrict who can push to matching branches** — leave the allowed-actors list **empty**. No one pushes to `main` directly; everything goes through a merged PR.
- ☐ **Allow force pushes** — **off**. Force-pushing `main` rewrites shared history; destructive to every collaborator.
- ☐ **Allow deletions** — **off**. No one can delete `main`.

#### Rules applied to administrators

- ☑ **Do not allow bypassing the above settings** — **single most important toggle on the page**. Admins follow the same rules. Without this, the protection is theatre.

### 4. Save

Click **Create** (or **Save changes**). The rule is live immediately.

---

## Verify it actually works

After saving:

### 1. Try to push directly to main

```bash
git checkout main
git pull --ff-only origin main
echo "test" >> README.md
git add README.md
git commit -m "test direct push"
git push origin main
```

Expected output:

```
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: Changes must be made through a pull request.
```

Reset your local change:

```bash
git reset --hard origin/main
```

### 2. Open a PR with failing CI

The **Merge** button should be greyed out with:

> Required statuses must pass before merging.

### 3. Open a PR with green CI but no review

The **Merge** button should require:

> 1 approving review is required by reviewers with write access.

If any of the three behaviours are missing, recheck the settings — you almost certainly forgot **"Do not allow bypassing the above settings"** or one of the **Restrict pushes** toggles.

---

## Repository-level settings (one-time)

Beyond branch protection, set these under **Settings → General**:

### Pull Requests section

- ☑ **Allow squash merging** — recommended default. One commit per PR on `main`.
- ☐ **Allow merge commits** — turn off. Combined with "Require linear history" it'd be blocked anyway; turning it off removes the option from the merge dropdown.
- ☑ **Allow rebase merging** — keep available for multi-commit PRs that genuinely want their history preserved (rare).
- ☑ **Always suggest updating pull request branches** — surfaces the "Update branch" button when `main` has moved.
- ☑ **Automatically delete head branches** — automates the "delete after merge" step from the Branching & Workflow rule.

### Code security and analysis section

- ☑ **Dependency graph** — required for Dependabot
- ☑ **Dependabot alerts** — opens issues for known CVEs in deps
- ☑ **Dependabot security updates** — opens PRs for CVE fixes (separate from the weekly version updates configured in `.github/dependabot.yml`)
- ☑ **Code scanning** → **CodeQL analysis** — use the **Advanced** setup and point it at `.github/workflows/codeql.yml`. Don't enable the default config — it conflicts with ours.
- ☑ **Secret scanning** — GitHub's built-in scan; complements gitleaks
  - ☑ **Push protection** — blocks pushes that contain detected secrets *before* they hit the remote

---

## Required GitHub repo secrets

CI doesn't need secrets to run today. Add these as you reach each phase, under **Settings → Secrets and variables → Actions**:

| Secret | Used by | Phase |
|--------|---------|-------|
| `GITLEAKS_LICENSE` | gitleaks workflow | Only if this repo becomes an organization-owned private repo |
| `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY`, `REFRESH_TOKEN_SECRET` | (future) deploy workflow | 1.4+ |
| `AI_PROVIDER_API_KEY` | (future) deploy workflow | 2+ |
| `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_PASSKEY`, `MPESA_SHORTCODE`, `MPESA_CALLBACK_URL` | (future) deploy workflow | 3 |
| `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | (future) deploy workflow | 3 |
| `SENDGRID_API_KEY` / `AWS_SES_*` | (future) deploy workflow | 3 |
| `ETIMS_CLIENT_ID`, `ETIMS_CLIENT_SECRET` | (future) deploy workflow | 4 |

> **Don't add secrets that no workflow consumes yet.** Unused secrets are a leak surface with no upside.

---

## Mapping AGENTS.md rules to GitHub enforcement

The Branching & Workflow rule in `AGENTS.md` lists the rules. Here's which are enforced by GitHub vs. which are still honour-system:

| AGENTS.md rule | How it's enforced |
|----------------|-------------------|
| Never `git push` to `main` directly | **Restrict pushes** (empty allow-list) |
| Never `git commit` while checked out on `main` | Honour-system locally; **Restrict pushes** prevents the commit from ever landing |
| Never merge a PR without CI green | **Require status checks to pass** |
| Rebase onto latest `main` before opening the PR | **Require branches to be up to date** |
| Never `--force` push to `main` | **Allow force pushes = off** |
| Branches are cheap, delete after merge | **Automatically delete head branches** |
| One milestone per branch | Honour-system + PR review judgement |
| Never skip hooks | Honour-system; local pre-commit hooks are a dev-machine concern |
| Branch naming convention (`feature/` `fix/` `docs/` `chore/` `refactor/`) | Honour-system + PR review judgement; could be enforced with a `danger.js` rule later |
| PR title follows conventional-commits | Honour-system + PR review judgement; could be enforced with a `pr-title-checker` action later |

The two with the largest gap between rule and enforcement are the **branch naming** and **PR title** ones. If naming drift becomes a real problem, add the linting actions. Until then, the PR template's checklist is the prompt.

---

## If something goes wrong

### "I really need to push to main right now" (production hotfix)

**Don't unprotect main.** Instead:

1. `git checkout main && git pull --ff-only origin main`
2. `git checkout -b fix/<short-description>`
3. Make the fix.
4. `git push -u origin fix/<short-description>`
5. Open the PR (`gh pr create --base main`).
6. Approve it yourself (admin override) — or get a teammate to. Either way, the review and CI are recorded.
7. Merge via the PR UI.

Even genuine hotfixes go through the workflow. The 90-second cost buys an audit trail and prevents the "and then it spiralled" scenario where the unprotected window stays open for a week.

### Branch protection blocking a legitimate merge

Most common cause: **"Required branches must be up to date."** Fix:

```bash
git checkout feature/<your-branch>
git fetch origin
git rebase origin/main
# Resolve conflicts if any.
git push --force-with-lease origin feature/<your-branch>
```

`--force-with-lease` is safer than `--force`: it refuses to overwrite work someone else pushed to your branch in the meantime.

### A required status check is "missing" after a workflow rename

When a workflow file or job is renamed, GitHub forgets the previous "required" tick. Open branch protection, remove the stale entry, and add the new job name.

### A required check is stuck "Expected" forever

This happens when a workflow's `paths` filter excludes the PR's changes — the check is required, but the workflow never ran. Two options:

- **Best:** trigger the workflow by touching a file in its paths filter (intentional, recorded in PR).
- **Quick:** temporarily remove that check from required status checks, merge, re-add.

Don't make this a habit — it indicates the paths filter is too narrow.

---

## Audit your protection rules periodically

Branch protection is a **set-and-drift** surface. Every quarter (or when CI workflows change), re-walk the settings:

1. Are all the required status check job names still real?
2. Have any new workflows been added that should be required?
3. Has anyone been added to the bypass list?
4. Is "Do not allow bypassing" still on?

A 5-minute walkthrough quarterly is cheaper than discovering, mid-incident, that protection silently lapsed three months ago.
