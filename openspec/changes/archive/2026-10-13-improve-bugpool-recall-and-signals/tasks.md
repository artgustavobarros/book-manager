## 1. Eval scenarios first (measure before changing)

- [x] 1.1 Branch `chore/bugpool-3-1` from an up-to-date `main`
- [x] 1.2 Add `evals/manifests/range.json` (base `c5246d7`, head `28021b9`, no seeds). It lists the known real defects:
  - double-failure rollback in `revertBookPatch`/`onMutate` (MEDIUM)
  - DELETE outside `bookWrites` (LOW)
  - insights `isRead` vs the shelf "lido" filter (LOW)
- [x] 1.3 Extend `build-bench.py` and `run-eval.sh` to accept a no-seed manifest with a `known_defects` list, and score recall against it
- [x] 1.4 Add `evals/manifests/composition.json`. Seeds in an optimistic-update/queue module where each single operation is correct and only a two-operation sequence is wrong. Do not reuse the range defect.
- [x] 1.5 Add a flaky scenario: a manifest seed that makes one test's `beforeAll` time out only on the first run (e.g. a marker file under the bench dir). Expected label: `flaky`.
- [x] 1.6 Add the severity-calibration column to `evals/scorecard.md` and document the new scenarios in `evals/README.md`
- [x] 1.7 Run v3.0.1 and the single-Sonnet baseline on range, composition and flaky. Record the rows as the "before" numbers. (Superseded as a gate by the `/code-review` comparison, see 6.1; rows kept for reference.)

## 2. Pre-pass

- [x] 2.1 `scripts/lib.sh`: make `run_related_tests` capture the output and detect setup/hook-timeout-only failures, then re-run exactly those files once
- [x] 2.2 `scripts/prepass.sh`: emit `ok | flaky | inconclusive | fail | skipped` and always print passed/failed/skipped counts, for both runs when retried
- [x] 2.3 `scripts/prepass.sh`: apply the default noise filter (lockfiles, `**/meta/*_snapshot.json`, `**/meta/_journal.json`, `BUGPOOL_IGNORE_DIRS` default `openspec/,docs/`). Honour `BUGPOOL_IGNORE` and `--no-ignore`. Print `ignored: N (<globs>)`.
- [x] 2.4 `SKILL.md` §1: write `$RUN/diff` with the same filter, using a shared helper in `lib.sh` so both stay in sync
- [x] 2.5 Check by hand on the range: the snapshot and openspec are ignored, `drizzle/0002_*.sql` and `.md` prompts outside the ignored dirs are kept

## 3. Lenses

- [x] 3.1 `correctness-stack.md`: add the generic composition bullet (two operations on the same field, ok/fail matrix, compare with the server state). Treat `flaky`/`inconclusive` as non-evidence.
- [x] 3.2 `qa.md`: a demonstrated wrong result means category `bug` at the source `file:line`, with severity by consequence. `qa/missing-test` with no defect is capped at LOW.
- [x] 3.3 `architecture.md`: remove the blanket "MEDIUM or lower" cap. A behavior defect means category `bug`. `duplicated-rule` without concrete divergence is capped at LOW.
- [x] 3.4 All lenses: append the `COVERAGE:` block (`read=`, `skipped=`, `reason=`) after `STRUCTURED_FINDINGS`
- [x] 3.5 `SKILL.md` §4: lenses write `$RUN/lens-<name>.md` and return the path and counts. The orchestrator parses the files. One optional re-dispatch per lens for skipped changed code files.

## 4. Router

- [x] 4.1 `router.md`: in a multi-commit local range, `SCOPE_DRIFT: not applicable (multi-commit range)`
- [x] 4.2 `SKILL.md` §3: check the Router output format and re-ask once if it is malformed. Pass DANGER on to validation.

## 5. Dedupe, validation, report

- [x] 5.1 `SKILL.md` §5: validate LOW `bug` findings in the MEDIUM batch. Cut the other LOW findings to 5 by bug > consistency > missing-test > weak-assertion > other, and record the dropped count.
- [x] 5.2 `validator.md`:
  - Allow throwaway repros only under `$RUN`, never in the repo, and cite the repro path.
  - Require a repro attempt for MEDIUM+ `bug` findings in unit-testable code when DANGER ≥ HIGH.
  - Add the `CONFIRMED (partly pre-existing)` verdict.
- [x] 5.3 `SKILL.md` §5: snapshot `git status --porcelain` before and after validation, and report any repo change as a skill error
- [x] 5.4 `report-templates.md`:
  - Unvalidated LOW findings are listed but never deducted.
  - Partly pre-existing findings deduct like CONFIRMED.
  - The verdict line names open validated MEDIUM+ findings with a `reproduced` marker.
  - Add per-lens coverage, `ignored: N`, `N LOW dropped`, and a "not verified" line.
- [x] 5.5 Bump `SKILL.md` `version` to 3.1.0 and update `argument-hint` with `--no-ignore`

## 6. Evaluate and accept

- [x] 6.1 Add `run-eval.sh --code-review` (Claude Code's built-in `/code-review`, default level, scenario changes staged on the review base). Run it and bugpool v3.1.0 on dev, clean, range, composition and held-out, plus bugpool on flaky, and append the rows to the scorecard
- [x] 6.2 Score every run by hand (a finding must describe the defect, not just name the file); record recall, FPs on clean, calibration, cost and time for both tools
- [x] 6.3 Fill in the gate table: bugpool total recall strictly above `/code-review`'s, held-out ≥ 4/5, clean FP ≤ 1 and ≤ `/code-review`'s, flaky labelled `flaky`
- [x] 6.4 Apply the fixes the eval runs exposed (no seed-specific text), and record what is left as follow-up
  - Applied: lenses are never skipped on small diffs (3.0.1 reviewed a small diff alone); unique `$RUN` per run (`mktemp -d`, stale `lens-*.md` risk); flaky bench setup comment made neutral.
  - Follow-up (not in this change): composition C1 (per-id queue ordering) missed by bugpool, caught by `/code-review`; range R2 (delete bypassing the write queue) missed by both; validator downgrades a seeded CRITICAL/HIGH to MEDIUM/LOW (calibration 2 on dev+held-out); bench worktrees list the `node_modules` symlink as untracked; ~8.5x cost of `/code-review`.
- [x] 6.5 Sync the accepted skill (without `evals/`) to `~/projects/skills/skills/bugpool`, commit there, and push only after the user confirms (synced, committed and pushed as `8a05ddb`, with the generic harness files of `evals/` that were already public)

## 7. Close

- [x] 7.1 PR + merge (merge commit, `--delete-branch`). Run `openspec validate --strict`, then `openspec archive -y` from the main checkout. Commit `docs(openspec): arquivar e sincronizar improve-bugpool-recall-and-signals` with `git add -f`.
