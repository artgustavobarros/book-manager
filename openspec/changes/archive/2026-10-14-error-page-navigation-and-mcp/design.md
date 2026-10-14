## Context

O Next.js App Router encapsula exceções não tratadas de páginas e layouts filhos em boundaries do tipo `error.tsx` (Client Components). No arquivo existente `app/error.tsx`, a moldura `StatusScreen` exibe uma mensagem de falha, um botão de retry e um link para voltar à Home.

Quando o layout autenticado (`app/(app)/layout.tsx`) falha durante o carregamento inicial da Home (por exemplo, por uma falha transitória ou query de banco pendente), a rota ativa no navegador já é `/`. Em rotas já ativas, o componente `<Link>` do Next.js cancela a navegação tradicional via `preventDefault()` e tenta um `router.push("/")`. Como a URL não muda, o cliente não dispara refetch de Server Components, mantendo a tela travada no fallback de erro.

## Goals / Non-Goals

**Goals:**
- Garantir que o link para o Painel na tela de erro recarregue a página de ponta a ponta quando o usuário já estiver na Home.
- Manter o padrão idiomático do Next.js (`retry()` como ação primária).
- Preservar o design system e layout visual existente do card `StatusScreen`.
- Habilitar o servidor MCP oficial do Next.js 16 para ferramentas e assistentes de código.

**Non-Goals:**
- Não reescrever o componente de erro usando hooks de rota desnecessários (`usePathname()`), mantendo a implementação limpa e sem sobrecarga de re-renders.
- Não alterar páginas de erro específicas da API ou telas de 404 (`not-found.tsx`).

## Decisions

### D1. Navegação nativa (`<a>`) em vez de roteamento client-side (`<Link>`) ou hooks condicionais
**Escolha:** Substituir `<Link href="/">` por `<a href="/">` no link secundário da tela de erro.
**Por quê:** Em HTML padrão, uma tag `<a>` sem interrupção de evento instrui o navegador a fazer um GET tradicional. Se o usuário estiver na Home, o navegador faz uma requisição completa de rede; se estiver em rota interna, navega para a Home com recarregamento completo, limpando qualquer estado corrompido do cliente sem complexidade adicional.

### D2. Registro do Next.js DevTools MCP no `.mcp.json`
**Escolha:** Configurar `next-devtools-mcp` executado via `npx -y` no arquivo `.mcp.json`.
**Por quê:** O Next.js 16 introduziu suporte nativo a MCP via `next-devtools-mcp`, permitindo inspeção em tempo real de logs, rotas e diagnósticos de compilação diretamente pelo servidor de desenvolvimento.
