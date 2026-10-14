# Tasks

## 1. Implementação da Navegação Nativa

- [x] Remover import de `Link` em `app/error.tsx`
- [x] Substituir elemento `<Link>` por tag nativa `<a>` com `href="/"` preservando classes e estilos
- [x] Confirmar que a função `retry()` permanece associada ao botão primário

## 2. Configuração de MCP

- [x] Adicionar entrada `next-devtools` ao arquivo `.mcp.json` na raiz
- [x] Preservar a configuração do servidor Neon existente

## 3. Verificação e Integração

- [x] Executar linting (`pnpm lint`) e verificar ausência de avisos
- [x] Executar verificação de tipos (`pnpm typecheck`)
- [x] Executar suíte de testes unitários e de integração (`pnpm test`)
- [x] Abrir Pull Request (#24), realizar squash merge na branch `main` e sincronizar repositório local
