## Context

`insights()` (`lib/domain/insights.ts`) monta `dataKpis` com 4 `Kpi` (`{label, value, sub}`), que `components/dados/insights-page.tsx` renderiza com o `KpiContent` compartilhado com o Painel (`components/app/kpi.tsx`). Os KPIs atuais vieram do standalone (`dados()` em `design/handoff/source/Acervo.dc.html`), e `lib/domain/insights.test.ts` compara `dataKpis` com o oráculo campo a campo.

O seletor de escopo fica no cabeçalho, ao lado do `h1`. Pela spec, ele só afeta os gráficos de status, gênero, nacionalidade e editora; os KPIs, o termômetro, os lidos por ano e a atribuição de ano não mudam com ele.

As telas `dados/desktop` e `dados/mobile` já estão em `DIVERGED` (`tests/support/visual-cases.ts`) e têm baselines próprias em `tests/visual/diverged.spec.ts`.

## Goals / Non-Goals

**Goals:**
- KPIs que só aparecem em Dados, sem repetir o Painel.
- Subtítulos de uma frase, no padrão "de 24 livros lidos", com texto próprio para cada estado sem dados.
- Deixar claro que o escopo vale só para os gráficos.

**Non-Goals:**
- Tornar os KPIs clicáveis (por exemplo, "Gênero mais lido" abrindo a Estante filtrada).
- Fazer os KPIs seguirem o escopo.
- Mudar os KPIs do Painel ou o conteúdo dos cards de gráfico.
- Mudar o número de KPIs (o carrossel continua com 4 itens).

## Decisions

### Cálculo dos KPIs em `insights()`

Tudo continua numa função pura em `insights.ts`, com as variáveis que ela já calcula (`read`, `withP`, `shelfPages`, `Y`).

- **Páginas na estante**: `shelfPages` como valor. O subtítulo compara `withP.length` com `books.length`. `estFull` e `missingP` deixam de aparecer no KPI, mas `estFull` continua alimentando o termômetro.
- **Gênero mais lido**: reaproveita `groupBy(read, "genre")`, que já ordena por contagem e, no empate, por `cmp` dos rótulos (a mesma ordem do gráfico de gêneros). Descarta a entrada cuja chave é `groupKey("")` ("não informado") e pega a primeira. O valor exibido é o `label` da entrada, igual à barra correspondente.
- **Ritmo de leitura**: `withYear = read.filter(b => b.yearRead)`. `first = min(yearRead)` e `span = max(Y, maxYearRead) - first + 1`, para não dividir por zero nem ficar negativo se algum ano lido estiver à frente de `Y`. O valor é arredondado com `Math.round(x * 10) / 10` e formatado por um `Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 })`, porque `nf()` aceita até 3 casas.
- **Países de origem**: `distinctCount(books, "nationality")`, que já ignora vazios e não diferencia maiúsculas.
- Os textos de singular e plural ficam inline em `insights.ts`, como os rótulos que o arquivo já monta. Um helper `plural(n, um, varios)` só entra se ele se repetir mais de duas vezes.

Alternativa descartada: um módulo `lib/domain/data-kpis.ts` separado. São 4 objetos, e o restante de `insights()` já calcula os insumos.

### Ritmo conta o ano corrente inteiro

O ano atual entra no divisor mesmo pela metade. Isso puxa a média para baixo no começo do ano, mas o texto "desde AAAA" é honesto e o cálculo é previsível. Contar só os anos completos deixaria o KPI vazio para quem começou a registrar este ano, e ponderar pela fração do ano exigiria `now` e fuso, que `insights()` não recebe (só recebe `year`).

### Valor em texto no `KpiContent`

O tipo `Kpi` (em `dashboard.ts`) ganha `text?: boolean`. Com `text`, o `KpiContent` troca `text-5xl` por `text-3xl`, adiciona `truncate` e `min-w-0` e põe `title={value}` quando o valor é string. O Painel não passa `text` e fica igual.

Alternativa descartada: detectar texto pelo conteúdo (`isNaN`). "—" e "3,2" complicariam a regra, e a intenção fica mais clara declarada no dado.

### Seletor de escopo acima da grade

O cabeçalho fica só com o `h1`. Entre os KPIs (com seus dots) e a grade de gráficos entra uma linha `flex flex-wrap items-center justify-between gap-3` com `<h2>Gráficos</h2>` e o `Segmented` atual (mesmo `label="Escopo dos gráficos"` e as mesmas classes). Para manter a hierarquia de títulos, o `CardHead` dos gráficos passa de `h2` para `h3`, sem mudança visual. Nenhum teste e2e busca esses títulos por nível.

### Teste do oráculo

O standalone continua sendo o oráculo do restante de `dados()` (termômetro, calhamaços, donut, barras, anos). Em `insights.test.ts`, a comparação `dataKpis × e.dataKpis` sai do bloco "insights × standalone" e entra um `describe("dataKpis")` com livros montados via `makeBook`, um caso por cenário da spec, incluindo os estados vazios e o singular. A asserção `d.dataKpis[0].value === "300"` do teste de emprestado-lido migra para o termômetro (`thermoLabel`), que é onde as páginas lidas continuam.

## Risks / Trade-offs

- [Gênero com rótulos inconsistentes ("romance" e "Romance ")] → agrupa com o `groupKey` dos gráficos. O rótulo exibido é o primeiro encontrado, o mesmo do gráfico.
- [Valor em texto quebrando a altura uniforme dos cards] → uma linha só, com `truncate`, e `text-3xl` tem altura de linha menor que `text-5xl`. Conferir no visual mobile (390px).
- [Ritmo baixo em janeiro] → aceito; ver a decisão acima.
- [Perder "Páginas lidas" no topo] → o termômetro de "Páginas lidas e calhamaços" mostra "X de ~Y páginas do acervo", e o Painel mantém o KPI.
- [Baselines visuais] → `dados/desktop` e `dados/mobile` mudam de propósito. Regerar só esses dois em `diverged.spec.ts` e comparar o restante com a baseline conhecida de falhas da main.

## Migration Plan

Mudança só de UI e de cálculo derivado, sem dados persistidos. O rollback é reverter o PR.
