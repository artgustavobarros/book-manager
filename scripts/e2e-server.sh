#!/usr/bin/env bash
# Servidor dos testes Playwright: banco PGlite novo, migrations, acervo de referência e build de produção.
set -euo pipefail
PORT="${1:-3100}"
rm -rf .data/e2e "${EMAIL_OUTBOX_FILE:-.data/outbox-e2e.jsonl}"
pnpm db:migrate
pnpm db:seed ana@exemplo.com senha-forte-123
pnpm build
exec pnpm start --port "$PORT"
