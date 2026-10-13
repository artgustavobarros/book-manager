## 0. Preparação

- [x] 0.1 Criar a branch `fix/bp-09` a partir da `main` atualizada

## 1. KPI "Emprestados" como `Button`

- [x] 1.1 Em `components/painel/dashboard-page.tsx`, importar `Button` junto com `IconButton` de `@/components/ui/button`
- [x] 1.2 No `map` dos KPIs, separar o conteúdo do cartão (rótulo, "Ver lista →", valor e subtítulo) para usar o mesmo JSX no `Button` e no `div`
- [x] 1.3 Renderizar o KPI "Emprestados" como `<Button variant="neutral" size="none" aria-haspopup="dialog" onClick={() => setLentOpen(true)}>`, com `card`, o layout atual e os overrides da base (`h-auto items-stretch justify-start whitespace-normal text-left font-normal`) no `className`
- [x] 1.4 Manter os outros KPIs como `div`, sem `role`, `tabIndex` nem `onClick`, e com `style` (atraso da animação) e `key` nos dois casos
- [x] 1.5 Conferir no navegador, a 1280px e a 390px, que o cartão fica igual aos outros (alinhamento à esquerda, borda, hover em tinta) e que o anel de foco aparece ao navegar com Tab

## 2. Testes

- [x] 2.1 E2E: no Painel, focar o KPI "Emprestados" (`getByRole("button", { name: /Emprestados/ })`), pressionar Enter e ver o diálogo "Livros emprestados"; fechar e repetir com Espaço
- [x] 2.2 Prova de detecção: com `dashboard-page.tsx` da `main`, o teste novo falha
- [x] 2.3 Os e2e atuais que abrem o modal pelo clique (`books.spec.ts`, `fixes.spec.ts`) e o `a11y.spec.ts` continuam passando
- [x] 2.4 Rodar o visual do Painel (`painel`, desktop e mobile) e, se o diff for só o esperado, atualizar o snapshot

## 3. Verificação e registro

- [x] 3.1 Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test` e `pnpm test:e2e`, comparando as falhas do e2e com as 10 já conhecidas da `main`
- [x] 3.2 `openspec validate lent-kpi-keyboard-button --strict`
- [x] 3.3 PR com a change arquivada e sincronizada no checkout principal (`git add -f` da change e de `openspec/specs/reading-dashboard/spec.md`), merge na `main` e `main` local atualizada
