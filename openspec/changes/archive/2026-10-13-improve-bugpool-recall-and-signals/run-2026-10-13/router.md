SCOPE_DRIFT:
- none | Every changed file maps to a commit subject. The non-bug items (.mcp.json Neon MCP entry, skills-lock.json neon/neon-postgres entries, EXPLORATORY_REVIEW.md deletion, .mcp.json newline) are named as chores in the commit list. scripts/seed-personas.ts and tests/fixtures/tests/support changes support the lentAt work. The title list includes BP-14 commits, though the body text only mentions BP-03..BP-12.
DANGER: HIGH
- Blast radius: drizzle/0002_cultured_jigsaw.sql adds a lent_at column and runs UPDATE books SET lent_at = updated_at WHERE status = 'emprestado' against production data. The schema and lib/services/books.ts now write to loan state. Backup import (lib/domain/backup.ts) changes how out-of-range numbers are handled. Client write serialization and optimistic rollback (lib/client/book-write-queue.ts, hooks/use-books.ts) add concurrency-sensitive logic.
EXTRA_LENSES:
- qa | scope: full | reason: tests changed across the diff, and behavior changed with it.
- architecture | scope: full | reason: about 2,000 changed source lines and new modules lib/client/book-cache.ts, lib/client/book-write-queue.ts, hooks/use-header-search.ts.
Note: the router says the flake note is in title-body.txt. It is actually in prepass.md, a small factual slip.
