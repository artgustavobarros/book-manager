## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-08` a partir da `main` atualizada
- [x] 0.2 Ler em `node_modules/next/dist/docs/` o que fala de `useRouter().push`, `useSearchParams` e da integração com `window.history.replaceState`

## 1. Rascunho da busca

- [x] 1.1 Criar `hooks/use-header-search.ts` com `useHeaderSearch()`, que devolve `{ query, setQuery, clear }`, guarda o rascunho e a pendência (com o `pathname` de origem)
- [x] 1.2 Em `setQuery`, atualizar o rascunho; na Estante, chamar `setShelf({ q })`; fora dela, navegar só na primeira tecla e marcar a pendência
- [x] 1.3 Entregar o rascunho com `setShelf({ q: draft })` quando a Estante abrir com navegação pendente, e limpar a pendência
- [x] 1.4 Fazer o rascunho seguir `state.q` quando não há pendência, ajustando durante o render
- [x] 1.5 Descartar a pendência quando o `pathname` for para uma página que não é a de origem nem a Estante

## 2. Header

- [x] 2.1 Em `AppHeader`, chamar `useHeaderSearch()` uma vez e passar o resultado para `WideHeader` e `NarrowHeader`
- [x] 2.2 Em `WideHeader`, usar `query` e `setQuery` no campo, sem `useShelfState`
- [x] 2.3 Em `NarrowHeader`, usar `query`, `setQuery` e `clear` no campo, em "Limpar" e em "Busca: … · editar"

## 3. Testes

- [x] 3.1 E2E: no Painel, a 1280px, focar a busca e digitar "kindred" com `keyboard.type` sem atraso; a URL termina com `q=kindred`, o campo mostra "kindred" e aparece "1 de N livros"
- [x] 3.2 E2E: o mesmo a 390px, abrindo a busca pelo ícone
- [x] 3.3 E2E: depois da busca a partir do Painel, `page.goBack()` volta direto para `/`
- [x] 3.4 Prova de detecção: com `app-header.tsx` da `main`, os testes novos falham
- [x] 3.5 Os e2e já existentes da busca (`fixes.spec.ts`, `responsive-header.spec.ts`, `books.spec.ts`, `stress.spec.ts`) continuam passando

## 4. Verificação e registro

- [x] 4.1 Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm test:e2e`, comparando as falhas do e2e com as 10 já conhecidas da `main`
- [x] 4.2 `openspec validate buffer-header-search-navigation --strict`
- [x] 4.3 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e de `openspec/specs/shelf-browsing/spec.md`), merge na `main` e `main` local atualizada
