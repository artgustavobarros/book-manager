## Why

On 2026-10-13 we ran `/bugpool --local --dry-run --base c5246d7`, covering the BP-03..BP-12 fixes (~2.7k lines of code, 100 files). Two observer agents watched the run and compared notes. The skill found one real MEDIUM bug: the optimistic rollback in `revertBookPatch`/`onMutate` restores a value the server never stored. It found it only by accident, though. The `qa` lens reported it as a missing test case, and the `correctness-stack` lens missed it and declared BP-04 fine. The run also showed problems with the signals the skill relies on:
- A cold-start test flake was labelled `fail` and handed to every lens as evidence of a regression.
- Severity caps per lens hid a behavior bug.
- Unvalidated LOW findings left the score ambiguous (91 vs 81).
- "No findings" cannot be told apart from "did not look".
- The orchestrator had to improvise several steps that `SKILL.md` leaves unspecified.

## What Changes

- **Pre-pass flake handling.** `prepass.sh` re-runs once only the suites that failed with a setup/hook timeout, never assertion failures. It labels the result `ok` / `flaky` / `inconclusive` / `fail` and always prints passed/failed/skipped counts. Lenses treat `flaky` and `inconclusive` as non-evidence. The report adds a "not verified" line, e.g. for integration and e2e suites the pre-pass does not run.
- **Behavior bugs keep their real category, file and severity.** When the `qa` or `architecture` lens demonstrates wrong behavior, it reports category `bug` at the source `file:line` with severity set by the consequence. Severity caps apply only to findings without a demonstrated defect: `qa/missing-test` and `architecture/duplicated-rule` with no concrete divergence are capped at LOW.
- **Composition check in `correctness-stack`.** For optimistic state, queues, retries, undo or local caches, the lens simulates two operations on the same field across ok/fail combinations and compares the final state with the server.
- **LOW handling.** LOW findings of category `bug` go to validation. Other LOW findings are cut to 5 by a stated order (bug > consistency > missing-test > weak-assertion), and the report shows how many were dropped. Unvalidated LOW findings are listed but do not deduct from the score.
- **Verdict honesty.** The verdict line names every open validated MEDIUM+ finding, flagging any with a reproduction. The score formula is unchanged.
- **Coverage declaration.** Every lens ends with a parseable `COVERAGE:` block listing what it read and what it skipped. The report shows it per lens, and the orchestrator may re-dispatch an unread area.
- **Diff noise filter.** By default the skill excludes lockfiles, generated snapshots and migration metadata and configurable docs/spec directories. A flag or env var configures the filter. The report shows an "ignored: N (globs)" line. Markdown in general is NOT excluded, since prompts and skills are markdown.
- **Lens output to files.** Each lens writes `$RUN/lens-<name>.md` with the `STRUCTURED_FINDINGS` and `COVERAGE` blocks and returns only the path and counts.
- **Router.**
  - In local mode over several commits, SCOPE_DRIFT reports "not applicable".
  - DANGER gains a consumer: when it is HIGH or above, validators MUST attempt a reproduction for MEDIUM+ `bug` findings in testable code.
  - The router's output format is checked.
- **Validator.**
  - Throwaway reproductions are explicitly allowed under `$RUN` only, never in the repo, and the verdict records the repro path.
  - New verdict `CONFIRMED (partly pre-existing)`, stating the share the change introduced.
- **Evaluation.**
  - New scenarios: a range scenario (this real run, c5246d7..28021b9, known real defects as ground truth), a composition-bug seeded scenario, and a flaky pre-pass scenario.
  - Severity calibration is measured as lens severity vs demonstrated consequence.
  - The acceptance gate compares bugpool with Claude Code's built-in `/code-review` (default level) on the same benches: bugpool must catch strictly more bugs, with no more false positives. The old cost gate against a single generic Sonnet prompt (failed for v2 at 4.5x–10.1x) is dropped; cost is recorded as information.
- Skill version → 3.1.0.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `bugpool-review`: the pre-pass gains flake handling and a noise filter. The lenses gain behavior-bug categorization, a composition check and a coverage declaration. Dedupe and validation gain LOW `bug` validation, an ordered LOW cut, repro rules and the partly-pre-existing verdict. The score and summary gain the LOW deduction rule and the verdict line. The Router changes for local ranges.
- `bugpool-evaluation`: new range, composition and flaky scenarios, a severity-calibration metric, and a cost gate redefined as no regression against v3.0.1.

## Impact

- `.agents/skills/bugpool/`:
  - `SKILL.md`
  - `scripts/prepass.sh` and `scripts/lib.sh`
  - `reference/lenses/{correctness-stack,security,qa,architecture,router,validator}.md`
  - `reference/report-templates.md`
  - `evals/` (new manifests, scorecard rows, README)
- The public source at `~/projects/skills/skills/bugpool` (same 3.0.1 skill, without evals) gets a commit after acceptance. In this repo `.agents/` is gitignored, so the PR carries only the OpenSpec archive.
- No application code, API or database changes. The app bugs found in the run (rollback double failure, L1 DELETE outside the write queue, L2 insights vs shelf "lido") are tracked separately as BP fixes, not in this change.
