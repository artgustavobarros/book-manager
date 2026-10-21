#!/usr/bin/env bash
# Servidor dos testes Playwright: banco PGlite novo, migrations, acervo de referência e build de produção.
set -euo pipefail
PORT="${1:-3100}"
EXPECTED_DATABASE_URL="pglite://${BOOK_MANAGER_E2E_RUN_DIR:?}/db"
if [[ "${DATABASE_URL:-}" != "$EXPECTED_DATABASE_URL" || "${DATABASE_URL_UNPOOLED:-}" != "$EXPECTED_DATABASE_URL" ]]; then
  echo "E2E exige DATABASE_URL e DATABASE_URL_UNPOOLED no banco temporário da execução." >&2
  exit 1
fi
mkdir -p -- "$BOOK_MANAGER_E2E_RUN_DIR"
pnpm db:migrate
pnpm db:seed ana@exemplo.com senha-forte-123
pnpm db:seed:personas
pnpm build
exec pnpm start --port "$PORT"
