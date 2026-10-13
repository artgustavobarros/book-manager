# bugpool-evaluation Specification

## Purpose
TBD - created by archiving change improve-bugpool-skill. Update Purpose after archive.
## Requirements
### Requirement: Benchmark scenarios

The bugpool skill SHALL ship an evaluation set with these scenarios.

| Scenario | Range | Seeds / ground truth | Measures |
| :--- | :--- | :--- | :--- |
| dev | PR #2 head `58d451a`, base `fca62ad` | S1–S5 | recall |
| held-out | commit `db0b2ac` against its parent | H1–H5 | recall, final acceptance only |
| clean | PR #1 head `1701c65` against `fca62ad` | no seeded bugs | false positives |
| range | `c5246d7..28021b9`, unmodified (real multi-commit range) | known real defects, verified manually | large-diff recall |
| composition | an optimistic-update or queue module | seeds where single operations are correct and only a two-operation sequence is wrong | composition recall |
| flaky | a test setup that times out on the first run only | no seeds | pre-pass flake labelling |

- **Clean false positives.** In the clean scenario, a false positive is a reported finding that manual verification shows to be incorrect. Findings verified as real pre-existing defects are not false positives.
- **Seeded manifests.** Each seeded scenario MUST be described by a manifest listing, per seed:
  - the file;
  - the exact original and replacement text;
  - the bug class;
  - the expected severity.
- **Range manifest.** The range scenario manifest SHALL list each known defect with file, defect description and expected severity, and SHALL be used only as a development scenario.

#### Scenario: Reproducible benchmark build
- **WHEN** the benchmark build script runs for a scenario
- **THEN** it creates a detached git worktree outside the repository tree at the scenario commit, applies the manifest seeds, commits them locally, and writes the diff file, failing loudly if any seed text does not match exactly once

#### Scenario: No outward effects
- **WHEN** any evaluation step runs
- **THEN** nothing is pushed, no GitHub comment is created, and the user's main working tree is unchanged

#### Scenario: Flaky scenario
- **WHEN** the flaky scenario runs
- **THEN** the pre-pass labels tests `flaky` and the report contains no finding citing the timed-out suites

### Requirement: Held-out isolation

The held-out seeds SHALL NOT be used while iterating on the skill and SHALL be run only for the final acceptance check. Skill instructions MUST NOT mention specific seeded bugs.

#### Scenario: Iteration run
- **WHEN** a skill change is evaluated during development
- **THEN** only the dev and clean scenarios are run

### Requirement: Scorecard metrics

Each evaluation run SHALL append to a scorecard file, per scenario:
- seeds or known defects caught (recall);
- false positives;
- severity calibration, as the number of caught items whose reported severity differs from the manifest's expected severity by more than one level;
- total cost in USD and wall time, as reported by the headless `claude -p --output-format json` run (including subagents);
- skill version;
- orchestrator model.

A seed or known defect counts as caught only if a reported finding identifies its file and describes its defect. Validator downgrades MUST NOT be used as a calibration metric.

#### Scenario: Recording a run
- **WHEN** an evaluation run completes
- **THEN** the scorecard gains one row per scenario with all metrics filled

### Requirement: Acceptance gate

A new skill version SHALL be accepted only if, in one run of the final version, it finds more bugs than Claude Code's built-in `/code-review` (default level, run headless on the same bench with the scenario changes staged on top of the review base) and all of the following hold:
- total recall over the dev, range, composition and held-out scenarios is strictly higher than `/code-review`'s on the same scenarios;
- held-out recall is at least 4/5;
- the clean scenario has at most 1 false positive, and no more than `/code-review`'s;
- the flaky scenario is labelled `flaky`.

Cost and wall time of both tools SHALL be recorded for every scenario as information; they are not a gate. All bugpool runs SHALL use `sonnet` as the orchestrator model.

#### Scenario: Gate failure
- **WHEN** any gate threshold is missed
- **THEN** the change is not considered complete and the scorecard records which threshold failed

#### Scenario: Tie with /code-review
- **WHEN** bugpool and `/code-review` catch the same number of items over the gated scenarios
- **THEN** the gate fails, because bugpool costs more and must find more to be worth running

