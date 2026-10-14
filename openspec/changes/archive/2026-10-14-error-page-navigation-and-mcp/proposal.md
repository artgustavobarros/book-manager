## Why

Na tela de erro genérica (`app/error.tsx`), a ação secundária "Voltar ao Painel" utilizava o componente `<Link href="/">` do Next.js. Quando uma exceção de servidor ou renderização ocorria justamente ao acessar a rota raiz (`/`), o clique no link era tratado como uma navegação suave (*soft navigation*) pelo roteador client-side do Next.js. Como a URL de origem já era `/`, o roteador tratava a navegação como no-op, não disparando nova requisição de rede e dando a impressão de um link inoperante.

Adicionalmente, o projeto não possuía o servidor MCP oficial do Next.js 16 (`next-devtools-mcp`) registrado no `.mcp.json`, impedindo assistentes e ferramentas de desenvolvimento de inspecionarem rotas, metadados e erros de compilação em tempo real.

## What Changes

- No `app/error.tsx`, substitui o `<Link>` do Next.js pela tag HTML nativa `<a>` com `href="/"`. O clique passa a acionar um *Hard Navigation* nativo do navegador, forçando um recarregamento HTTP completo da página mesmo se o erro tiver ocorrido na Home.
- Preserva integralmente o layout visual existente do card de erro (`StatusScreen`, tipografia, logo e tokens visuais) e a ação primária "Tentar de novo" baseada no prop padrão `retry()` do Next.js.
- Registra o servidor MCP `next-devtools-mcp` no arquivo de configuração de MCPs (`.mcp.json`) ao lado da conexão Neon existente.
- Formaliza o comportamento da tela de erro na especificação de `app-shell`.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `app-shell`: adiciona o requisito "Tela de erro e recuperação", estabelecendo que a navegação para o Painel a partir da tela de erro deve utilizar requisição nativa (Hard Navigation) para garantir recuperação efetiva mesmo em falhas ocorridas na raiz.

## Impact

- `app/error.tsx`: remoção do import de `Link` e uso de `<a>`.
- `.mcp.json`: adição da entrada `next-devtools`.
- `openspec/specs/app-shell/spec.md`: sincronização com o novo requisito.
- Sem quebras de contrato de API, schema de banco ou testes existentes.
