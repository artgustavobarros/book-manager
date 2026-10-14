## Why

Os 4 KPIs do topo de Dados do acervo fogem do padrão do card da meta ("de 24 livros lidos"), em que o subtítulo completa o número numa frase curta. Três subtítulos juntam duas ideias com "·", têm de 40 a 70 caracteres (quebram em 2 a 4 linhas e deixam os cards com alturas diferentes) e usam abreviações ("p.", "nº", "~"). Um deles corrige o próprio número ("31.900" seguido de "~35.700 estimadas"), e "Diversidade literária" não diz o que o número conta. Além disso, três dos quatro indicadores repetem o Painel (páginas lidas, % lidos, nacionalidades), e o seletor "Todo o acervo / Apenas lidos" fica no cabeçalho, dando a impressão de valer para a página toda, quando só afeta os gráficos.

## What Changes

- **KPIs de Dados**: o conjunto passa a ser, nesta ordem:
  - **Páginas na estante**: soma das páginas informadas, com o subtítulo "somando X de N livros" (ou "somando os N livros" quando todos têm páginas). A estimativa "~N estimadas, contando M livros sem nº de páginas" sai do KPI; ela continua no termômetro de "Páginas lidas e calhamaços".
  - **Gênero mais lido** (novo): o gênero com mais livros lidos, com o subtítulo "N dos M lidos".
  - **Ritmo de leitura** (novo): média de livros lidos por ano, do primeiro ano lido registrado até o ano atual, com o subtítulo "livros por ano desde AAAA".
  - **Países de origem**: substitui "Diversidade literária". O número é a contagem de nacionalidades distintas dos autores, e o subtítulo é "entre os autores do acervo". As contagens de editoras e gêneros saem do KPI, porque os badges dos gráficos já as mostram.
- **Saem** os KPIs "Páginas lidas" e "Leitura concluída", que repetem o Painel. As páginas lidas continuam no termômetro de calhamaços, e a distribuição por status continua no donut.
- **Subtítulos de frase única**: cada subtítulo é uma frase curta que dá referência ao número, sem "·", sem abreviações e com singular e plural corretos. Cada KPI tem um texto próprio para o estado sem dados.
- **KPI com valor em texto**: quando o valor é uma palavra (gênero), o número aparece em tamanho menor e com truncamento, para não estourar o card.
- **Seletor de escopo**: sai do cabeçalho da página e vai para uma linha "Gráficos" logo acima da grade de gráficos, abaixo dos KPIs. Os KPIs continuam ignorando o escopo, agora de forma explícita.
- **BREAKING (interno)**: `insights().dataKpis` muda de rótulos e de semântica. O teste de oráculo deixa de comparar os KPIs com `dados()` do standalone.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `collection-insights`: conjunto, cálculos e textos dos KPIs de dados; tipografia dos KPIs (valor em texto); posição do seletor de escopo e indicação de que ele não afeta os KPIs.

## Impact

- `lib/domain/insights.ts`: novo cálculo de `dataKpis` (Páginas na estante, Gênero mais lido, Ritmo de leitura, Países de origem).
- `lib/domain/dashboard.ts`: o tipo `Kpi` ganha um marcador opcional de valor em texto.
- `components/app/kpi.tsx`: `KpiContent` aceita o valor em texto (tamanho menor e truncamento). O Painel não muda.
- `components/dados/insights-page.tsx`: o seletor de escopo sai do cabeçalho e vai para a linha "Gráficos" acima da grade, e os títulos dos cards de gráfico passam a `h3`.
- `lib/domain/insights.test.ts`: os KPIs saem da comparação com o oráculo e ganham asserções próprias, cobrindo singular e plural, estados vazios e empates.
- Testes visuais: atualizar as baselines `dados/desktop` e `dados/mobile` em `tests/visual/diverged.spec.ts` (já estão em `DIVERGED`).
- Sem mudança de dados, API ou dependências.
