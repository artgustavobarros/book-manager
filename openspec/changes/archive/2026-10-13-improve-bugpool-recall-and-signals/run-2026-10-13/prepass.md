## Pre-pass (c5246d7...HEAD + working tree)

Changed files (99): .mcp.json components/app/app-header.tsx components/app/app-provider.tsx components/books/book-card.tsx components/books/book-row.tsx components/books/lent-badge.tsx components/painel/dashboard-page.tsx drizzle/0002_cultured_jigsaw.sql drizzle/meta/0002_snapshot.json drizzle/meta/_journal.json hooks/use-books.ts hooks/use-header-search.ts lib/client/book-cache.test.ts lib/client/book-cache.ts lib/client/book-write-queue.test.ts lib/client/book-write-queue.ts lib/db/schema.ts lib/domain/backup.test.ts lib/domain/backup.ts lib/domain/dashboard.test.ts lib/domain/dashboard.ts lib/domain/insights.test.ts lib/domain/insights.ts lib/domain/sheet.test.ts lib/domain/sheet.ts lib/domain/shelf.test.ts lib/domain/shelf.ts lib/domain/status.test.ts lib/domain/status.ts lib/domain/text.test.ts lib/domain/text.ts lib/domain/types.ts lib/domain/weekly-sheets.test.ts lib/domain/weekly-sheets.ts lib/services/books.ts lib/validation/book.ts openspec/changes/archive/2026-10-12-clear-borrower-on-sheet-merge/.openspec.yaml openspec/changes/archive/2026-10-12-clear-borrower-on-sheet-merge/design.md openspec/changes/archive/2026-10-12-clear-borrower-on-sheet-merge/proposal.md openspec/changes/archive/2026-10-12-clear-borrower-on-sheet-merge/specs/spreadsheet-sync/spec.md openspec/changes/archive/2026-10-12-clear-borrower-on-sheet-merge/tasks.md openspec/changes/archive/2026-10-12-preserve-year-read-on-return/.openspec.yaml openspec/changes/archive/2026-10-12-preserve-year-read-on-return/design.md openspec/changes/archive/2026-10-12-preserve-year-read-on-return/proposal.md openspec/changes/archive/2026-10-12-preserve-year-read-on-return/specs/book-catalog/spec.md openspec/changes/archive/2026-10-12-preserve-year-read-on-return/specs/collection-insights/spec.md openspec/changes/archive/2026-10-12-preserve-year-read-on-return/specs/reading-dashboard/spec.md openspec/changes/archive/2026-10-12-preserve-year-read-on-return/tasks.md openspec/changes/archive/2026-10-12-scope-optimistic-rollback/.openspec.yaml openspec/changes/archive/2026-10-12-scope-optimistic-rollback/design.md openspec/changes/archive/2026-10-12-scope-optimistic-rollback/proposal.md openspec/changes/archive/2026-10-12-scope-optimistic-rollback/specs/app-shell/spec.md openspec/changes/archive/2026-10-12-scope-optimistic-rollback/tasks.md openspec/changes/archive/2026-10-12-serialize-book-mutations/.openspec.yaml openspec/changes/archive/2026-10-12-serialize-book-mutations/design.md openspec/changes/archive/2026-10-12-serialize-book-mutations/proposal.md openspec/changes/archive/2026-10-12-serialize-book-mutations/specs/app-shell/spec.md openspec/changes/archive/2026-10-12-serialize-book-mutations/tasks.md openspec/changes/archive/2026-10-12-test-backup-import-edge-cases/.openspec.yaml openspec/changes/archive/2026-10-12-test-backup-import-edge-cases/design.md openspec/changes/archive/2026-10-12-test-backup-import-edge-cases/proposal.md openspec/changes/archive/2026-10-12-test-backup-import-edge-cases/specs/data-portability/spec.md openspec/changes/archive/2026-10-12-test-backup-import-edge-cases/tasks.md openspec/changes/archive/2026-10-12-track-loan-start-date/.openspec.yaml openspec/changes/archive/2026-10-12-track-loan-start-date/design.md openspec/changes/archive/2026-10-12-track-loan-start-date/proposal.md openspec/changes/archive/2026-10-12-track-loan-start-date/specs/book-catalog/spec.md openspec/changes/archive/2026-10-12-track-loan-start-date/specs/data-portability/spec.md openspec/changes/archive/2026-10-12-track-loan-start-date/specs/reading-dashboard/spec.md openspec/changes/archive/2026-10-12-track-loan-start-date/specs/shelf-browsing/spec.md openspec/changes/archive/2026-10-12-track-loan-start-date/tasks.md openspec/changes/archive/2026-10-13-buffer-header-search-navigation/.openspec.yaml openspec/changes/archive/2026-10-13-buffer-header-search-navigation/design.md openspec/changes/archive/2026-10-13-buffer-header-search-navigation/proposal.md openspec/changes/archive/2026-10-13-buffer-header-search-navigation/specs/shelf-browsing/spec.md openspec/changes/archive/2026-10-13-buffer-header-search-navigation/tasks.md openspec/changes/archive/2026-10-13-lent-kpi-keyboard-button/.openspec.yaml openspec/changes/archive/2026-10-13-lent-kpi-keyboard-button/design.md openspec/changes/archive/2026-10-13-lent-kpi-keyboard-button/proposal.md openspec/changes/archive/2026-10-13-lent-kpi-keyboard-button/specs/reading-dashboard/spec.md openspec/changes/archive/2026-10-13-lent-kpi-keyboard-button/tasks.md openspec/changes/archive/2026-10-13-sort-empty-author-publisher-last/.openspec.yaml openspec/changes/archive/2026-10-13-sort-empty-author-publisher-last/design.md openspec/changes/archive/2026-10-13-sort-empty-author-publisher-last/proposal.md openspec/changes/archive/2026-10-13-sort-empty-author-publisher-last/specs/shelf-browsing/spec.md openspec/changes/archive/2026-10-13-sort-empty-author-publisher-last/tasks.md openspec/specs/app-shell/spec.md openspec/specs/book-catalog/spec.md openspec/specs/collection-insights/spec.md openspec/specs/data-portability/spec.md openspec/specs/reading-dashboard/spec.md openspec/specs/shelf-browsing/spec.md openspec/specs/spreadsheet-sync/spec.md scripts/seed-personas.ts skills-lock.json tests/e2e/fixes.spec.ts tests/fixtures/reference-books.json tests/integration/api.test.ts tests/support/reference.ts

### lint check (changed files, no fixes): ok

### typecheck (project): ok

### related unit tests: fail
```

 RUN  v5.0.2 /home/arthur/projects/portfolio-projects/book-manager

 ❯ tests/integration/sheet-export.test.ts (5 tests | 5 skipped) 12102ms
 ❯ tests/integration/google-avatar.test.ts (6 tests | 6 skipped) 12121ms
 ❯ tests/integration/api.test.ts (33 tests | 33 skipped) 12239ms
 ❯ tests/integration/account.test.ts (4 tests | 4 skipped) 12113ms
 ❯ tests/integration/auth.test.ts (9 tests | 9 skipped) 12837ms

⎯⎯⎯⎯⎯⎯ Failed Suites 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/integration/account.test.ts [ tests/integration/account.test.ts ]
Error: Hook timed out in 10000ms.
If this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".
 ❯ tests/integration/account.test.ts:15:1
     13| const PASSWORD = "senha-forte-123";
     14|
     15| beforeAll(async () => {
       | ^
     16|   await setupTestDb();
     17| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  tests/integration/api.test.ts [ tests/integration/api.test.ts ]
Error: Hook timed out in 10000ms.
If this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".
 ❯ tests/integration/api.test.ts:22:1
     20| let bia: Awaited<ReturnType<typeof createUserSession>>;
     21|
     22| beforeAll(async () => {
       | ^
     23|   await setupTestDb();
     24|   ana = await createUserSession("Ana Lima");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  tests/integration/auth.test.ts [ tests/integration/auth.test.ts ]
Error: Hook timed out in 10000ms.
If this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".
 ❯ tests/integration/auth.test.ts:16:1
     14|
     15| let db: DB;
     16| beforeAll(async () => {
       | ^
     17|   db = await setupTestDb();
     18| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  tests/integration/google-avatar.test.ts [ tests/integration/google-avatar.test.ts ]
Error: Hook timed out in 10000ms.
If this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".
 ❯ tests/integration/google-avatar.test.ts:12:1
     10|
     11| let db: DB;
     12| beforeAll(async () => {
       | ^
     13|   db = await setupTestDb();
     14| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  tests/integration/sheet-export.test.ts [ tests/integration/sheet-export.test.ts ]
Error: Hook timed out in 10000ms.
If this is a long-running hook, pass a timeout value as the last argument or configure it globally with "hookTimeout".
 ❯ tests/integration/sheet-export.test.ts:150:1
    148| const third = new Date("2026-10-19T06:00:00Z");
    149|
    150| beforeAll(async () => {
       | ^
    151|   db = await setupTestDb();
    152|   ana = await createUserSession("Ana");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯


 Test Files  5 failed | 14 passed (19)
      Tests  113 passed | 57 skipped (170)
   Start at  00:48:19
   Duration  15.16s (tests 84%, import 14%, transform 2%)
```

> NOTA DO ORQUESTRADOR: a falha de 'related unit tests' é flake de cold start. As 5 suítes, rodadas de novo, passaram 57/57.
