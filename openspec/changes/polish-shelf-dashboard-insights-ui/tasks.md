## 1. Preparação

- [x] 1.1 Criar a branch a partir da `main` atualizada (nome a confirmar com o usuário, por exemplo `feat/ui-polish`)
- [x] 1.2 Adicionar `toggle-group` com `pnpm dlx shadcn@latest add toggle-group` e conferir que veio em Base UI, sem dependências novas e sem editar `components/ui/`

## 2. Painel

- [x] 2.1 Criar `components/custom/action-button.tsx` envolvendo `Button` (`neutral`/`xs`) com `duration-200` e borda/texto `acc` no hover e no foco visível
- [x] 2.2 Usar o `ActionButton` em "Terminei", "Ler" e "Devolver" em `components/painel/dashboard-page.tsx`
- [x] 2.3 Fazer cada item dos carrosséis de KPIs e de listas ocupar 100% da largura útil do trilho (`auto-cols-[100%]`)

## 3. Card e linha de livro

- [x] 3.1 Em `book-card.tsx`, trocar ♥/♡/✓/✎ por `HeartIcon`/`CheckIcon`/`PencilIcon` e as cores fixas por `bg-acc text-onacc` (ativo) e `bg-card text-ink` (inativo)
- [x] 3.2 Criar um helper do ícone de ação de status (`PlayIcon`/`CheckIcon`/`RotateCcwIcon`) e usá-lo no botão do card e da linha
- [x] 3.3 Em `book-row.tsx`, trocar ✎ e ✕ por `PencilIcon` e `Trash2Icon`, mantendo `aria-label`/`title` e ícones com `aria-hidden`
- [x] 3.4 Reescrever `status-select.tsx` sobre o `Select` do Base UI (pílula com ponto e fundo de 16%, `items`, `aria-label="Status"`, ponto nos itens, `stopPropagation` no wrapper, `min-h-11` até 640px)
- [x] 3.5 Conferir que trocar o status pelo card e pela linha não abre a ficha e que "Emprestado" segue o fluxo de empréstimo

## 4. Estante até 640px

- [x] 4.1 Esconder a contagem "N livros" até 640px e deixar "Estante" e `SortMenu` na mesma linha com `justify-between`
- [x] 4.2 Passar `chosen` (`sort !== DEFAULT_SHELF.sort`) ao `SortMenu`: só "Ordenar" quando não houver escolha, só a opção (com "Ordenar" em `sr-only`) quando houver
- [x] 4.3 Transformar os chips (com a pílula de faceta) numa faixa de rolagem horizontal sem quebra até 640px, sem rolagem horizontal da página a 320px
- [x] 4.4 Esconder o `Segmented` de texto até 640px e adicionar acima da lista o `ToggleGroup` de ícones (`LayoutGridIcon`/`ListIcon`, `aria-label` "Capas"/"Lista", 44×44px)
- [x] 4.5 Conferir que acima de 640px o cabeçalho não mudou

## 5. Dados

- [x] 5.1 Remover a prop `barColor` do `BarCard` e usar `var(--acc)` nas barras de gênero, nacionalidade e editora
- [x] 5.2 Colunas de "Lidos por ano": ano corrente `var(--acc)`, demais `color-mix(in oklch, var(--acc) 45%, var(--card))`
- [x] 5.3 Remover `scopeCaption` de `lib/domain/insights.ts`, de `insights.test.ts` e do cabeçalho em `insights-page.tsx`
- [x] 5.4 Fazer cada KPI e cada gráfico ocupar 100% da largura útil do trilho (`auto-cols-[100%]`)

## 6. Componentes compartilhados

- [x] 6.1 `CarouselDots`: botões `h-11 w-6` (16px entre pontos inativos, alvo de 24×44px)
- [x] 6.2 `mobile-fabs.tsx`: trocar 🎲 por `ShuffleIcon` nos estados habilitado e desabilitado
- [x] 6.3 `surprise-modal.tsx`: trocar "🎲 Sortear outro livro" por `ShuffleIcon` + "Sortear outro livro"

## 7. Ajustes da revisão

- [x] 7.1 Criar `components/app/kpi.tsx` (`kpiCardClass`, `KpiContent`) com o título, o número e o subtítulo do card "Meta de leitura" e usá-lo nos KPIs do Painel e de Dados
- [x] 7.2 Criar `hooks/use-drag-scroll.ts` e ligá-lo à faixa de chips da Estante (arraste com mouse, snap desligado durante o arraste, clique pós-arraste descartado)
- [x] 7.3 Colocar a data do cabeçalho do Painel acima da saudação, alinhada à direita, em `text-base text-mute`
- [x] 7.4 Tirar o botão de ação rápida de status do card de capa e deixar o seletor de status na largura toda do card (a lista mantém o botão)
- [x] 7.5 Trocar o botão "Limpar" do header compacto por um `XIcon` dentro do campo de busca (`aria-label` "Limpar busca", só com texto, devolve o foco ao campo)

## 8. Testes e verificação

- [x] 8.1 Atualizar os e2e que usam `selectOption` no `combobox "Status"` (`books.spec.ts`, `fixes.spec.ts`, `tests/visual/new-screens.spec.ts`) para abrir o Select e escolher a opção
- [x] 8.2 Procurar nos testes referências a 🎲, "Sortear outro livro", "Gráficos calculados" e à contagem da Estante no mobile, e ajustar o que houver
- [x] 8.3 Conferir no navegador a 320, 360, 390 e 768px e no desktop, nos temas claro e escuro (Painel, Estante em capas/lista, Dados, sorteio), e ajustar as larguras mínimas dos carrosséis se preciso
- [x] 8.4 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 8.5 Rodar os e2e e visuais, comparar com a baseline de falhas conhecidas da `main` e regenerar só os snapshots que mudaram por causa desta change
- [x] 8.6 Rodar `openspec validate polish-shelf-dashboard-insights-ui --strict`
- [ ] 8.7 Abrir o PR com a change e, depois do merge, arquivar e sincronizar a change no checkout principal (`git add -f` da change arquivada e das specs principais)
