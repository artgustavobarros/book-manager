## Why

A dry-run evaluation of the `bugpool` skill (PR #2 with 5 seeded bugs) caught only 3/5 — the same recall as a single Sonnet reviewer at ~3.4x the tokens — because the Router can skip the lens that would catch the bug and Pass 1 blockers stop the review early. Its auto-fix path can also destroy uncommitted work (`git checkout -- <files>`), its typecheck gate let all 5 seeded bugs through, and the skill cannot be evaluated or used without an open PR. We are improving the skill itself (not the app), and doing it eval-first as the Anthropic skill-authoring guide recommends.

## What Changes

- Add an **evaluation harness** for the skill: `--dry-run` mode (no GitHub writes, no commits/pushes), three scenarios (dev seeded bugs, held-out seeded bugs, clean PR), and a recorded scorecard (recall, false positives, tokens, wall time) with v1 baseline 3/5.
- **BREAKING** (skill behavior): auto-fix refuses to run on a dirty working tree, runs in an isolated git worktree checked out at the PR head, validates with typecheck + `ultracite check` + `vitest related`, batches fixes into one commit, and pushes only with an explicit `--push` flag. Never runs `git checkout --` on the user's tree and never runs lint with `--fix`.
- **Recall**: deterministic pre-pass script (lint check, typecheck, related tests on changed files) fed to reviewers; core lenses (`correctness-stack`, `security`) always run; the Router may only add `qa`/`architecture`; Pass 1 / Pass 2 become report ordering, not an early stop.
- **Precision**: dedupe findings (file, line ±3, category) and validate each finding of severity ≥ MEDIUM with a refute-first validator; drop findings without `file:line` proof.
- **Structure**: move fragile `gh`/GraphQL/sticky-summary operations into `scripts/`, lens prompts into `reference/lenses/`; fix the reply-body newline bug (body via file); use model aliases (`haiku`/`sonnet`/`opus`) instead of the stale `claude-haiku-4-5` ID; score = 100 − Σ deductions; `--local` mode (review branch/working tree without a PR); explicit loop stop condition (max rounds); version the skill in git (un-ignore `.agents/skills/bugpool/`).
- Acceptance gate: held-out recall ≥ 4/5, ≤ 1 false positive on the clean scenario, cost ≤ 1.5x the single-Sonnet baseline.

## Capabilities

### New Capabilities
- `bugpool-review`: Behavior of the bugpool PR review skill — modes (PR, `--local`, `--dry-run`), deterministic pre-pass, reviewer panel and lens selection, finding validation/dedupe, triage with human immunity, safe auto-fix, sticky summary and scoring.
- `bugpool-evaluation`: The evaluation harness for the bugpool skill — benchmark scenarios, seeded-bug manifests, metrics, scorecard, and the acceptance gate.

### Modified Capabilities
<!-- none: no existing spec covers the bugpool skill -->

## Impact

- `.agents/skills/bugpool/` (SKILL.md rewritten; new `scripts/`, `reference/lenses/`, `evals/`).
- `.claude/commands/bugpool.md` (usage/flags updated).
- `.gitignore` (negation so the bugpool skill is versioned).
- No application code, API, or database changes. Evaluation uses throwaway git worktrees outside the repo tree and never pushes or comments on GitHub.
