# bugpool-review Specification

## Purpose
TBD - created by archiving change improve-bugpool-skill. Update Purpose after archive.
## Requirements
### Requirement: Review modes

The bugpool skill SHALL support three invocation modes: PR mode (`/bugpool [<PR number|URL>]`), local mode (`--local`, reviewing the current branch against its base plus uncommitted changes, without requiring a PR), and dry-run (`--dry-run`, combinable with either). In dry-run the skill MUST NOT post, edit, reply to, or resolve anything on GitHub and MUST NOT commit, push, or modify files in the user's working tree.

#### Scenario: Merged or closed PR
- **WHEN** PR mode targets a PR whose state is MERGED or CLOSED and `--dry-run` is not set
- **THEN** the skill stops and reports that there is nothing to triage

#### Scenario: Dry-run against a merged PR
- **WHEN** `/bugpool <PR> --dry-run` targets a merged PR
- **THEN** the skill runs pre-pass, review panel, validation and prints the report, with zero GitHub writes and zero git writes

#### Scenario: Local mode without a PR
- **WHEN** `/bugpool --local` runs on a branch with no open PR
- **THEN** the skill reviews `git diff <base>...HEAD` plus uncommitted changes and prints the report without any GitHub calls

### Requirement: Deterministic pre-pass

Before any reviewer runs, the skill SHALL execute a bundled pre-pass script that runs the project's lint check (non-mutating), typecheck, and related unit tests for the changed files, and SHALL pass the resulting diagnostics to every reviewer as context. The pre-pass MUST NOT run any lint or format command with fix/write flags.

#### Scenario: Lint diagnostic on a changed line
- **WHEN** the lint check reports a diagnostic on a line changed by the diff
- **THEN** the diagnostic is included in the reviewers' context and becomes a candidate finding citing the rule id

#### Scenario: Pre-pass tool unavailable
- **WHEN** a pre-pass command is missing or fails to start
- **THEN** the skill records it as "skipped" in the report and continues with the review

### Requirement: Reviewer panel with core lenses

The skill SHALL always run the `correctness-stack` and `security` lenses over the full diff. The Router SHALL only decide which additional lenses (`qa`, `architecture`) to run and MUST NOT be able to remove a core lens. Pass 1 (critical) and Pass 2 (informational) SHALL determine report ordering only and MUST NOT stop other lenses from running.

#### Scenario: Critical finding early
- **WHEN** the Router finds a CRITICAL issue in Pass 1
- **THEN** both core lenses and any Router-selected lenses still run and report

#### Scenario: Small low-risk diff
- **WHEN** the diff is under 100 changed lines and the Router rates danger LOW
- **THEN** only the core lenses run

### Requirement: Finding dedupe and validation

The skill SHALL merge duplicate findings (same file, line within ±3, same category) and SHALL validate every merged finding of severity MEDIUM or higher with a refute-first validator before it is reported, fixed, or posted. Findings the validator rejects, or that lack concrete `file:line` evidence, MUST be dropped. Security findings rated CRITICAL or HIGH SHALL be validated with the `opus` model; others with `sonnet`.

#### Scenario: Same bug reported by several lenses
- **WHEN** three lenses report the same issue at lines 98, 100 and 101 of one file
- **THEN** the report contains one finding listing the contributing lenses

#### Scenario: Hallucinated claim
- **WHEN** a finding's claim is contradicted by the code or tool output during validation
- **THEN** the finding is dropped and counted under "rejected by validation" in the report

### Requirement: Human immunity

The skill MUST NOT auto-fix, reply to, or resolve any GitHub review thread that contains at least one human-authored comment. A comment is automated only if its author is a bot account or it was posted by bugpool itself.

#### Scenario: Mixed thread
- **WHEN** a thread has a bot comment followed by a human reply
- **THEN** the thread is listed as "human — untouched" and no action is taken on it

### Requirement: Safe auto-fix

Auto-fix SHALL run only in PR or local mode without `--dry-run`, and only when the user's working tree has no uncommitted changes. Fixes SHALL be applied in an isolated git worktree checked out at the reviewed HEAD, validated by typecheck, non-mutating lint check, and related tests, and combined into a single commit. The skill MUST NOT run `git checkout -- <files>`, `git reset --hard`, or any discard command on the user's working tree, and MUST push only when `--push` is given.

#### Scenario: Dirty working tree
- **WHEN** auto-fix is about to start and `git status --porcelain` is non-empty
- **THEN** the skill skips auto-fix, lists the actionable findings as pending, and leaves the working tree unchanged

#### Scenario: Gate failure
- **WHEN** a fix makes the gate fail
- **THEN** that fix is discarded inside the isolated worktree only, the finding is reclassified as AMBIGUOUS, and the user's tree is untouched

#### Scenario: Push not requested
- **WHEN** fixes pass the gate and `--push` is absent
- **THEN** the skill reports the commit SHA and branch for the user to inspect and does not push

### Requirement: Bounded review loop

After applying fixes, the skill SHALL re-run validation-scoped review on the changed hunks for at most 2 additional rounds and SHALL stop earlier when a round yields no new validated finding of severity MEDIUM or higher.

#### Scenario: Converged
- **WHEN** round 2 yields no new validated MEDIUM+ finding
- **THEN** the loop stops and the report states the number of rounds run

### Requirement: Sticky summary and score

In PR mode without `--dry-run` the skill SHALL maintain exactly one PR comment marked `<!-- bugpool-summary -->`, posted through a bundled script that sends the body from a file. Every posted comment MUST start with the bugpool bot-identifier header. The quality score SHALL be `max(0, 100 − Σ deductions)` with CRITICAL 30, HIGH 15, MEDIUM 5, LOW 2, NIT 0, counted over validated findings only.

#### Scenario: Re-run on the same PR
- **WHEN** bugpool runs again on a PR that already has a summary comment
- **THEN** the existing comment is updated in place and no second summary is created

#### Scenario: Multi-line body
- **WHEN** a reply or summary body contains line breaks
- **THEN** the posted comment renders real line breaks, not literal `\n`

