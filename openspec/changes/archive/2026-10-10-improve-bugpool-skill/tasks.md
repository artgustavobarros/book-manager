## 1. Versioning and layout

- [ ] 1.1 (BLOCKED — awaiting user: `.gitignore` `#ai` block deliberately ignores `.agents`/`.claude`/`openspec`) Update `.gitignore` so `.agents/skills/bugpool/` is tracked while other untracked `.agents` content stays ignored; verify with `git check-ignore`
- [x] 1.2 Snapshot current SKILL.md as v1 reference (`evals/v1-SKILL.md`) and create the directory layout (`reference/lenses/`, `scripts/`, `evals/manifests/`, `evals/runs/`)

## 2. Evaluation harness (Phase 0)

- [x] 2.1 Write `evals/manifests/dev.json` (PR #2: base `fca62ad`, head `58d451a`, seeds S1–S5 with exact find/replace text, class, severity)
- [x] 2.2 Write `evals/manifests/heldout.json` (commit `db0b2ac` vs parent, seeds H1–H5; H3 must target the unique `lt(sheetExportRuns.leaseUntil, now)` occurrence inside `dueSheetExportUsers`)
- [x] 2.3 Write `evals/manifests/clean.json` (PR #1: base `fca62ad`, head `1701c65`, no seeds)
- [x] 2.4 Implement `evals/build-bench.py` (worktree outside repo, exact-once seed application, local commit, symlink node_modules/.env*/skill, write diff) and verify each manifest builds
- [x] 2.5 Implement `evals/run-eval.sh <scenario> [--baseline]` (headless `claude -p`, `--model sonnet`, json output, budget cap, disallowed push/commit/gh/Edit/Write, save run JSON, remove worktree)
- [x] 2.6 Create `evals/scorecard.md` with columns and the v1 exploratory baseline row (dev 3/5, hand-orchestrated) and run the single-Sonnet baseline on dev and clean

## 3. Safe auto-fix (Phase 3)

- [x] 3.1 Implement `scripts/fix-worktree.sh` (`create <sha>`, `gate <files…>`, `revert <files…>` inside worktree only, `commit <msg>`, `remove`) with dirty-tree precondition helper
- [x] 3.2 Write `reference/lenses/fixer.md` (edit only inside the fix worktree, minimal patch, run gate)

## 4. Recall: pre-pass and lenses (Phase 1)

- [x] 4.1 Implement `scripts/prepass.sh <base> [--local]` (changed files, lint check without fix, typecheck, vitest related; status ok/fail/skipped; markdown output) and verify on a bench worktree
- [x] 4.2 Write `reference/lenses/router.md` (danger, scope drift, optional qa/architecture only)
- [x] 4.3 Write `reference/lenses/correctness-stack.md`, `security.md`, `qa.md`, `architecture.md` (generic, no seed-specific hints; shared STRUCTURED_FINDINGS format)

## 5. Precision (Phase 2)

- [x] 5.1 Write `reference/lenses/validator.md` (refute-first, CONFIRMED/REJECTED + evidence, batch format)
- [x] 5.2 Specify dedupe rule and validation routing (opus for security CRITICAL/HIGH) in SKILL.md workflow

## 6. GitHub scripts and structure (Phase 4)

- [x] 6.1 Implement `scripts/threads.sh` (GraphQL review threads → JSON with human/bot classification)
- [x] 6.2 Implement `scripts/post.sh` (reply/sticky/find-sticky; replaces planned reply.sh + sticky.sh) (bodies from file via `-F body=@file`, bot header enforced, sticky upsert by marker)
- [x] 6.3 Write `reference/report-templates.md` (sticky summary, terminal report, score formula)
- [x] 6.4 Rewrite SKILL.md (<200 lines): modes (PR/--local/--dry-run/--push), checklist workflow, core rules, model aliases, bounded loop (max 2 extra rounds), links one level deep
- [x] 6.5 Update `.claude/commands/bugpool.md` usage and flags

## 7. Evaluate and iterate

- [x] 7.1 Run v2 on dev and clean; score against manifests; append to scorecard
- [x] 7.2 (not needed: dev 5/5, clean 0 FP) Iterate on skill text if dev recall < 5/5 or clean FP > 1 (one change per run, no seed-specific hints), re-run dev/clean
- [x] 7.3 (gate FAILED on cost only — see scorecard) Run final version on held-out, dev and clean; record whether the acceptance gate passes
- [x] 7.4 Clean up all eval worktrees and confirm the user's working tree is unchanged
