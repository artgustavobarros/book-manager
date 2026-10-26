#!/usr/bin/env bash
# Chrome DevTools MCP com o Chromium que o Playwright do projeto já baixou (pnpm exec
# playwright install chromium): sem Chrome no sistema e sem caminho fixo de máquina.
set -euo pipefail
cd "$(dirname "$0")/.."
chrome="$(node -e 'console.log(require("@playwright/test").chromium.executablePath())')"
exec npx -y chrome-devtools-mcp@latest --isolated --headless --executablePath="$chrome"
