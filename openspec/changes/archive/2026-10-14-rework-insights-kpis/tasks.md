## 1. Preparação

- [x] 1.1 Criar a branch `feat/insights-kpis` a partir da `main` atualizada
- [x] 1.2 Rodar `pnpm test` e anotar o estado atual de `lib/domain/insights.test.ts`

## 2. Cálculo dos KPIs (`lib/domain/insights.ts`)

- [x] 2.1 Adicionar `text?: boolean` ao tipo `Kpi` em `lib/domain/dashboard.ts`
- [x] 2.2 Reescrever "Páginas na estante": valor `shelfPages` e subtítulos "somando X de N livros", "somando os N livros", "somando 1 livro" e o estado "—" / "nenhum livro com páginas informadas"
- [x] 2.3 Criar "Gênero mais lido" com `groupBy(read, "genre")`, descartando "Não informado", com `text: true`, subtítulo "N dos M lidos" / "o único lido" e os estados vazios "nenhum livro lido ainda" e "nenhum lido com gênero informado"
- [x] 2.4 Criar "Ritmo de leitura": `span = max(Y, maior ano lido) - primeiro ano + 1`, uma casa decimal em pt-BR, "livros por ano desde AAAA" (singular abaixo de 2), "livros lidos em AAAA" quando o primeiro ano é o atual, e "—" / "registre o ano de leitura dos lidos"
- [x] 2.5 Trocar "Diversidade literária" por "Países de origem" (`distinctCount(books, "nationality")`, "entre os autores do acervo", "—" / "nenhuma nacionalidade informada")
- [x] 2.6 Remover "Páginas lidas" e "Leitura concluída" de `dataKpis` e apagar variáveis que ficarem sem uso (`avgRead`, `readPct`, `readingN`, `missingP`), mantendo `estFull` e `readPages` para o termômetro

## 3. Testes de domínio (`lib/domain/insights.test.ts`)

- [x] 3.1 Tirar a comparação de `dataKpis` com o oráculo no bloco "insights × standalone"
- [x] 3.2 Criar `describe("dataKpis")` com `makeBook` cobrindo cada cenário da spec: páginas parciais e completas, empate de gênero, gênero não informado, ritmo desde 2022 ("3,2"), ritmo só no ano atual, ritmo sem ano, países com caixa diferente e vazio
- [x] 3.3 Cobrir singular e estados vazios: um único lido, ritmo menor que 2 ("livro por ano"), acervo sem páginas, sem nacionalidades
- [x] 3.4 Garantir que os KPIs ficam iguais nos escopos "todos" e "lidos"
- [x] 3.5 Migrar a asserção `dataKpis[0].value === "300"` do teste de emprestado-lido para `thermoLabel`
- [x] 3.6 `pnpm test` verde

## 4. Interface

- [x] 4.1 `components/app/kpi.tsx`: aceitar `text` no `KpiContent` (`text-3xl`, `truncate`, `min-w-0`, `title` com o valor), sem alterar o caminho padrão usado pelo Painel
- [x] 4.2 `components/dados/insights-page.tsx`: passar `text={k.text}` ao `KpiContent`
- [x] 4.3 Tirar o `Segmented` do cabeçalho e criar a linha "Gráficos" (`h2` + `Segmented`, com o mesmo `label` e as mesmas classes) entre os dots dos KPIs e a grade de gráficos
- [x] 4.4 Passar o título do `CardHead` de `h2` para `h3`, sem mudança visual
- [x] 4.5 Conferir no navegador, a 1280px e a 390px nos dois temas: alturas iguais dos KPIs, gênero longo truncado e o seletor acima dos gráficos, também no carrossel mobile

## 5. Verificação

- [x] 5.1 `pnpm lint` e `pnpm typecheck`
- [x] 5.2 Regerar só as baselines `dados/desktop` e `dados/mobile` em `tests/visual/diverged.spec.ts` (`--update-snapshots` filtrado por esses casos) e revisar as imagens
- [x] 5.3 Rodar `pnpm test:e2e` e `pnpm test:visual` e comparar com a baseline conhecida da main (9 falhas no e2e e 5 no visual), confirmando que `a11y` de `/dados` não ganhou violações

## 6. Entrega

- [x] 6.1 Commit e PR para a `main`, com a change OpenSpec no mesmo PR
- [x] 6.2 Depois do merge: `openspec validate rework-insights-kpis --strict`, `openspec archive rework-insights-kpis -y` no checkout principal (não em worktree), conferir o número de `### Requirement` em `openspec/specs/collection-insights/spec.md` e fazer o commit `docs(openspec): arquivar e sincronizar rework-insights-kpis` com `git add -f`
