## Context

Bugpool 3.0.1 came out of `improve-bugpool-skill` (archived 2026-10-10). That change passed recall and false-positive gates but failed the cost gate: 4.5x–10.1x the single-Sonnet baseline. On 2026-10-13 we ran it as `/bugpool --local --dry-run --base c5246d7`, over the BP-03..BP-12 fixes. Two observer agents, A ("skill author") and B ("skeptical evaluator"), watched the run through a trace file and recorded a dialogue. Their consolidated list, with B's objections, drives this design. The run artifacts were `trace.md`, `dialogue.md`, `improvements.md`, `lens-*.md`, `validation-batch1.md` and `report.md`. They live in a session scratchpad and are summarized here.

| Stage | Observation |
| :--- | :--- |
| Pre-pass (24s) | 5 integration suites hit `Hook timed out` (pglite cold start), labelled `fail`. The orchestrator re-ran them by improvisation: 57/57 green. |
| Router (haiku) | DANGER HIGH, added qa and architecture, SCOPE_DRIFT "none" (title/body = 20 commit subjects). Broke the "Output exactly" format and misplaced a fact. |
| correctness-stack | 10 tool uses, claimed it read "every changed hunk", 2 cosmetic LOW findings. **Missed** the double-failure rollback bug. |
| security | 6 tool uses, `none`. Admitted it did not read the route handlers or client code. |
| qa | Found the rollback bug as `qa/missing-case` MEDIUM, pointing at the test file. Also reported 1 MEDIUM missing-test and 4 LOW. |
| architecture | 1 MEDIUM duplicated-rule. The DELETE-outside-queue race came out LOW because of the lens's "MEDIUM or lower" cap. |
| Validator (160s) | Reproduced the rollback bug with a throwaway vitest under the scratchpad (CONFIRMED MEDIUM). Downgraded the other two MEDIUMs to LOW. One was partly pre-existing, a verdict it could not express. |
| Report | 91/A, APPROVE WITH NITS. 81 if the 5 unvalidated LOW findings counted, and the template is ambiguous on that. |

## Goals / Non-Goals

**Goals:**
- A real behavior bug is reported as a bug wherever the lens that sees it sits, and dedupe and validation can act on it.
- Signals handed to lenses are trustworthy: no flake reported as `fail`, no generated noise.
- "No findings" can be told apart from "did not look".
- No step the orchestrator has to improvise: LOW cut, score rule, repro permission, partly pre-existing.
- Every behavior change is backed by an eval scenario, never by tuning to a specific seed.

**Non-Goals:**
- Fixing the app bugs the run found. They become separate BP branches.
- Splitting `correctness-stack` by area. The evidence (one miss) is too weak, so it is measured first; see Open Questions.
- Fuzzy or semantic dedupe.

## Decisions

1. **Retry only setup timeouts, once.** `run_related_tests` captures the vitest output. If failures are only hook/setup timeouts, it re-runs exactly those files once and labels `flaky` on pass or `inconclusive` on repeat timeout. Assertion failures are never retried, so a real concurrency flake is not masked (B). *Alternative:* raise `hookTimeout` globally. Rejected because it is repo-specific, and the skill must stay portable.
2. **A demonstrated defect beats lens identity.** Rather than adding merge-by-evidence logic to dedupe, the `qa` and `architecture` lenses emit category `bug` at the source `file:line` when they demonstrate wrong behavior. The existing file/line dedupe then merges the finding naturally with any `correctness-stack` report. Merging on files cited in `evidence` is deferred until evals show this is not enough (B's ordering).
3. **Severity caps only for non-defects.** `qa/missing-test` and `architecture/duplicated-rule` without demonstrated divergence are capped at LOW. Behavior bugs have no cap. Calibration is measured against a graded eval key, not by counting validator downgrades. Downgrades are designed behavior, and minimizing them would reward under-reporting (B).
4. **Composition check, phrased generically.** A bullet added to `correctness-stack.md`: for optimistic state, queues, retry, undo and caches, simulate operations A then B on the same field for ok/ok, fail/ok, ok/fail and fail/fail, and compare the final client state with the server's. It mentions no seed or file of this repo.
5. **LOW policy.**
   - LOW findings of category `bug` are validated.
   - The rest are cut to 5 by the order bug > consistency > missing-test > weak-assertion > other.
   - The report shows "N LOW dropped".
   - Unvalidated LOW findings never deduct from the score.
   - This resolves A and B's disagreement in favour of B: validating all LOW findings that have a scenario costs too much for findings like a spurious toast.
6. **Verdict line, not a grade cap.** A proposed to cap the grade or verdict when a reproduced data-inconsistency MEDIUM is open. B objected that "data inconsistency" is subjective and breaks determinism. Adopted: keep the formula, and make the verdict line list every open validated MEDIUM+ finding with a `reproduced` marker.
7. **Coverage block.** `COVERAGE: read=<files|globs> skipped=<files|globs> reason=<one line>` after `STRUCTURED_FINDINGS`. The orchestrator may re-dispatch the same lens on a skipped area that contains changed code files, at most once per lens. It is shown in the report as "security: no findings · covered X/Y code files".
8. **Noise filter defaults.** Excluded by default:
   - lockfiles (`*.lock`, `pnpm-lock.yaml`, `package-lock.json`, `skills-lock.json`)
   - generated migration metadata (`**/meta/*_snapshot.json`, `**/meta/_journal.json`)
   - `BUGPOOL_IGNORE_DIRS` (default `openspec/,docs/`)

   Overridable with `--no-ignore` or `BUGPOOL_IGNORE`. `**/*.md` is not excluded (B): prompts, skills and AGENTS.md are code here. Migration SQL itself is NOT excluded.
9. **Lens output to files.** Lenses write `$RUN/lens-<name>.md` and reply with the path and counts. This reduces the orchestrator's context: about 293k lens tokens came back as messages in this run.
10. **The Router's DANGER gets a consumer.** DANGER ≥ HIGH makes validators attempt a reproduction for MEDIUM+ `bug` findings in unit-testable code. A repro is a throwaway test or script under `$RUN`, importing the code by absolute path, with zero writes to the repo. *Alternative:* drop DANGER. Rejected because the repro was the highest-value evidence in the run, and DANGER is a cheap way to decide when to pay for it. In local mode over more than one commit, SCOPE_DRIFT outputs `not applicable (multi-commit range)`.
11. **Validator verdict `CONFIRMED (partly pre-existing)`.** The finding states which part the range introduced. The score deducts for it like CONFIRMED.
12. **The gate is "finds more bugs than `/code-review`".** The question the user asked is whether bugpool is worth running instead of Claude Code's built-in `/code-review`. So the reference is `/code-review` at its default level, run headless on the same bench (`run-eval.sh --code-review`, with the scenario changes staged on the review base because it reviews the current diff). Bugpool must catch strictly more items over dev, range, composition and held-out, with no more false positives on clean. Cost and time are recorded for both but do not gate. *Alternative:* a cost-ratio gate against a generic single-Sonnet prompt (v2) or against the previous version (first draft of this change). Rejected: neither answers "is it better than what Claude Code already ships?"

## Risks / Trade-offs

- [Retry hides a real intermittent bug that manifests as a hook timeout] → only setup/hook timeouts are retried, and `flaky` is printed in the report rather than shown as `ok`.
- [Validating LOW `bug` findings adds validator cost] → batched with the MEDIUM batch, at most 8 per agent. No separate agent unless they overflow.
- [Repro under `$RUN` imports from the repo and could write to it (e.g. a DB file)] → the validator prompt forbids repo writes. The orchestrator checks `git status --porcelain` before and after validation and reports any change as a skill error.
- [Coverage re-dispatch inflates cost] → at most one re-dispatch per lens, only for skipped changed code files.
- [The noise filter hides a bug in an ignored path] → it shows "ignored: N (globs)", `--no-ignore` exists, and an eval checks a bug in a `.md` prompt is still caught.
- [The range scenario's ground truth comes from this run] → it is used only as a dev scenario, never held-out. Ground truth includes defects found by the observers, not just the skill.

## Migration Plan

The skill is not tracked in this repo (`.agents` is gitignored by the user's choice), and its public source is `~/projects/skills` (`artgustavobarros/skills`). Edit the local copy in `.agents/skills/bugpool/`, where the private evals live, while on a branch (`chore/bugpool-3-1`) that will carry only the OpenSpec archive, run the dev, clean, range, composition and flaky scenarios, record them in the scorecard, then run held-out once for acceptance. Bump `version` to 3.1.0. After acceptance, copy the skill (without `evals/`, which holds private code) to `~/projects/skills/skills/bugpool` and commit it there. Pushing to the public repo needs the user's confirmation. Rollback means reverting that commit; the local copy is restored from the public repo.

## Open Questions

- How much extra cost per extra bug found is acceptable? The scorecard records both tools' cost so the user can judge; it is not a gate.
- Should `correctness-stack` be split by area (client/concurrency vs domain/services) for large diffs? Measure on the range scenario first (P2-3), with no change in this proposal.
