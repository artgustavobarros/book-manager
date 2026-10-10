## Context

`bugpool` lives at `.agents/skills/bugpool/SKILL.md` (symlinked from `.claude/skills/bugpool`, invoked through `.claude/commands/bugpool.md`). It is currently a single 381-line instruction file, git-ignored by the `.agents` rule in `.gitignore:40`, and has never run on any PR of this repo.

An exploratory evaluation (PR #2 head with five seeded bugs, hand-orchestrated) found:
- recall 3/5 for the skill vs 3/5 for one generic Sonnet reviewer, at ~3.4x the subagent tokens;
- the Router skipped the `stack` lens, which alone caught 4/5;
- a lens asserted a false fact ("lint did not flag it"), and the same IDOR was reported by 4 agents (no validation, no dedupe);
- `pnpm typecheck` passed with all five seeds, while `ultracite check` flagged two (unused `userId`, missing hook dep) in 36 ms — and `lint:fix` would have "fixed" the IDOR by renaming the param to `_userId`;
- rollback via `git checkout -- <files>` would wipe uncommitted edits; `-F body="…\n…"` posts literal `\n`; the pinned `claude-haiku-4-5` costs 10x Haiku 5.5.

Constraints: Claude Code subagents accept `model: haiku|sonnet|opus`; `isolation: worktree` branches from the default branch (not the PR head). Headless `claude -p --output-format json` reports total cost and duration including subagents, and supports `--max-budget-usd` and `--disallowedTools`.

## Goals / Non-Goals

**Goals:**
- Make the skill measurable (dry-run, local mode, benchmark, scorecard) before changing review logic.
- Remove the data-loss and over-reach risks of auto-fix.
- Raise recall without the Router being a single point of failure; raise precision with validation + dedupe.
- Follow the Anthropic skill-authoring guide: concise SKILL.md, progressive disclosure (one level deep), scripts for fragile deterministic operations, feedback loops.

**Non-Goals:**
- Fixing application bugs found during evaluation (the app is not under evaluation).
- Making the skill project-agnostic beyond sensible detection of `pnpm`/`npm` scripts.
- CI/GitHub Action integration.

## Decisions

### D1 — Evaluation runs a fresh headless Claude ("Claude B") inside a benchmark worktree
`evals/run-eval.sh <scenario> [--baseline]` builds the scenario worktree (via `evals/build-bench.py` + manifest), links `node_modules`, `.env*` and the skill under evaluation into it, and runs `claude -p "/bugpool --local --base <sha> --dry-run" --model sonnet --output-format json --max-budget-usd 3` with `--disallowedTools` for `git push`, `git commit`, `gh`, `Edit`, `Write`. Output JSON (report text, `total_cost_usd`, `duration_ms`) is saved under `evals/runs/`. Scoring against the manifest is done by the maintaining session and appended to `evals/scorecard.md`.
- *Why*: tests the skill exactly as a user invokes it, gives real cost numbers including subagents, and enforces dry-run at the tool level rather than trusting the prompt.
- *Alternative*: hand-orchestrating agents from the maintaining session (what the exploration did) — rejected: it evaluates the orchestrator's interpretation, not the skill text, and gives no cost figure.

### D2 — Worktrees outside the repo, symlinked dependencies
Benchmarks live under `${BUGPOOL_EVAL_DIR:-$TMPDIR/bugpool-eval}`. `node_modules` and `.env*` are symlinked from the main checkout (exploration showed `next typegen` fails without env and `pnpm` deps check fails on symlinked modules, so the pre-pass calls `npx next typegen && npx tsc --noEmit` when the `typecheck` script is `next typegen && tsc …`, or generally runs the script binaries via `npx`). Worktrees are removed after each run.

### D3 — Pre-pass is a bundled script, results are context not verdicts
`scripts/prepass.sh <base>` resolves changed files (`git diff --name-only <base>...HEAD` + untracked/modified in `--local`), runs: lint check on changed files (`npx ultracite check <files>` when ultracite is a dependency, else the `lint` script), typecheck (`typecheck` script), and `npx vitest related --run <files>` when vitest is present. Output is a markdown block with per-tool status (`ok|fail|skipped`) and diagnostics truncated to changed files. Never passes fix/write flags.
- *Why*: deterministic, near-free signal that caught 2/5 seeds; script = low freedom for a fragile step.

### D4 — Core lenses always on; Router only adds
Lenses: `correctness-stack` (logic, polarity of conditions, async result handling, hooks/deps, server/client boundaries, SIZE-1..4) and `security` always run on the full diff, on `sonnet`. The Router (`haiku`) reads the diff + pre-pass and emits danger level, scope drift, and optional `qa`/`architecture` delegations. Pass 1/Pass 2 only order the report.
- *Alternative*: run all four lenses always — rejected as default for cost; architecture/qa findings rarely block and are mostly Pass 2.

### D5 — Dedupe, then refute-first validation in batches
Merge findings by (file, line ±3, category). Validators receive a batch of findings for one file group with the instruction to try to disprove each claim by reading code and pre-pass output; output `CONFIRMED|REJECTED` + evidence. Security CRITICAL/HIGH findings get an individual `opus` validator; all other MEDIUM+ batches use `sonnet`; LOW/NIT are not validated and capped at 5 in the report.
- *Why*: precision control used by the official `/code-review` plugin and G-Research's two-pass pattern; batching keeps cost bounded.

### D6 — Auto-fix in a script-managed worktree
`scripts/fix-worktree.sh create <sha>|gate|commit <msg>|remove` manages `$TMPDIR/bugpool-fix-<sha>`; a `sonnet` fix subagent edits only inside that path. Gate = typecheck + lint check on touched files + `vitest related`. A failing fix is reverted *inside the worktree*. All passing fixes become one commit on local branch `bugpool/fix-<short-sha>`; with `--push` the skill pushes it to the PR head ref, otherwise it prints the branch/SHA. Precondition: `git status --porcelain` empty in the user's tree.
- *Alternative*: Agent `isolation: worktree` — rejected because it branches from the default branch, not the PR head, and auto-cleans in ways the skill cannot control.

### D7 — Progressive disclosure layout
```
.agents/skills/bugpool/
  SKILL.md                    (~100 lines: modes, checklist workflow, rules)
  reference/lenses/{router,correctness-stack,security,qa,architecture,validator,fixer}.md
  reference/report-templates.md
  scripts/{lib.sh,prepass.sh,threads.sh,post.sh,fix-worktree.sh}
  evals/{manifests/*.json,build-bench.py,run-eval.sh,scorecard.md}
```
GitHub bodies are always written to a temp file and sent with `-F body=@file` (`post.sh reply|sticky`). Per-run temp files live in `$TMPDIR/bugpool-<short sha>/` so parallel runs never collide.

### D8 — Model aliases only
SKILL.md uses `haiku`/`sonnet`/`opus` aliases (resolved by Claude Code to current versions) and drops full IDs and the Gemini column.

### D9 — Version the skill
Add `!.agents/skills/bugpool/` after the `.agents` line in `.gitignore` (git cannot re-include a file if its parent dir is excluded, so the rule becomes `.agents/*` + `!.agents/skills/` + `.agents/skills/*` + `!.agents/skills/bugpool/`, keeping other untracked agent dirs ignored while already-tracked skills stay tracked).

## Risks / Trade-offs

- [Overfitting to dev seeds] → held-out seeds are only run at the end; skill text must not mention seed-specific patterns.
- [Single run variance — LLM reviews are stochastic] → record every run; if gate result is borderline, run the scenario twice and report both.
- [Eval cost on the user's account] → `--max-budget-usd 3` per run; at most ~8 runs planned (v1 dev, baselines, iterations, final 3 scenarios).
- [Validator rejects true bugs] → validators must cite contradicting code to reject; rejection counts are reported so recall loss is visible in the scorecard.
- [Pre-pass slow on large repos] → limited to changed files; typecheck is whole-project but already required by the gate.
- [Headless run needs Bash permissions] → run with `--permission-mode bypassPermissions` only inside the throwaway worktree, with push/commit/gh/Edit/Write disallowed.

## Open Questions

- Whether `qa` should become a core lens if held-out shows test-related misses (decide from scorecard).
