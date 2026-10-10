## ADDED Requirements

### Requirement: Benchmark scenarios

The bugpool skill SHALL ship an evaluation set with three scenarios: a dev scenario (PR #2 head `58d451a`, base `fca62ad`, seeds S1–S5), a held-out scenario (commit `db0b2ac` against its parent, seeds H1–H5), and a clean scenario (PR #1 head `1701c65` against `fca62ad`, with no seeded bugs). In the clean scenario a false positive is a reported finding that manual verification shows to be incorrect; findings verified as real pre-existing defects are not false positives. Each seeded scenario MUST be described by a manifest listing, per seed, the file, the exact original and replacement text, the bug class, and the expected severity.

#### Scenario: Reproducible benchmark build
- **WHEN** the benchmark build script runs for a scenario
- **THEN** it creates a detached git worktree outside the repository tree at the scenario commit, applies the manifest seeds, commits them locally, and writes the diff file, failing loudly if any seed text does not match exactly once

#### Scenario: No outward effects
- **WHEN** any evaluation step runs
- **THEN** nothing is pushed, no GitHub comment is created, and the user's main working tree is unchanged

### Requirement: Held-out isolation

The held-out seeds SHALL NOT be used while iterating on the skill and SHALL be run only for the final acceptance check. Skill instructions MUST NOT mention specific seeded bugs.

#### Scenario: Iteration run
- **WHEN** a skill change is evaluated during development
- **THEN** only the dev and clean scenarios are run

### Requirement: Scorecard metrics

Each evaluation run SHALL record, per scenario: seeds caught (recall), false positives, total cost in USD and wall time as reported by the headless `claude -p --output-format json` run (including subagents), skill version, and orchestrator model, appended to a scorecard file. A seed counts as caught only if a reported finding identifies its file and describes its defect.

#### Scenario: Recording a run
- **WHEN** an evaluation run completes
- **THEN** the scorecard gains one row per scenario with all metrics filled

### Requirement: Acceptance gate

The improved skill SHALL be accepted only if, in one run of the final version: held-out recall is at least 4/5, the clean scenario has at most 1 false positive, dev recall is at least the v1 baseline (3/5), and total cost is at most 1.5x the single-Sonnet baseline (one generic review prompt run headless with `--model sonnet`) measured on the same scenario. Both runs SHALL use `sonnet` as the orchestrator model for comparability.

#### Scenario: Gate failure
- **WHEN** any gate threshold is missed
- **THEN** the change is not considered complete and the scorecard records which threshold failed
