# Visualização de livros adquiridos por ano

Consulta em 2026-11-18. Pergunta: como comparar, no celular e no computador, a quantidade de livros adquiridos em cada ano?

## Recomendação: colunas verticais

Livros adquiridos em um ano são um **fluxo**: a contagem soma eventos dentro de um período. O [Office for National Statistics (ONS)](https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type#stock-or-flow-data-in-change-over-time-charts) recomenda colunas para fluxos e distingue a série de um estoque, como o total de livros acumulado até cada ano. Colunas fazem a comparação direta: cada ano tem uma marca própria, e a altura parte de zero. O [guia de colunas do ONS](https://service-manual.ons.gov.uk/data-visualisation/chart-types/column-chart) também dá preferência ao formato quando a leitura dos valores individuais importa e há poucos pontos.

Para este app: ordenar da esquerda para a direita, usar números inteiros, identificar o ano atual como parcial e preservar os mesmos dados e a mesma escala ao comparar os formatos anuais. Em tela estreita, reduzir a quantidade de rótulos visíveis no eixo sem esconder dados; se a leitura do ano exato ficar difícil, manter uma tabela de apoio ou considerar barras horizontais. A [Datawrapper](https://academy.datawrapper.de/article/15-how-to-create-a-column-chart) identifica o espaço para rótulos no eixo horizontal como a principal limitação das colunas.

## Alternativas

| Formato | Serve melhor para | Contrapartida nesta tela |
| --- | --- | --- |
| Colunas verticais | Comparar quantidades anuais exatas em ordem cronológica. [ONS: Column chart](https://service-manual.ons.gov.uk/data-visualisation/chart-types/column-chart) | Muitos anos exigem mais largura ou menos rótulos simultâneos. |
| Linha com pontos | Enxergar tendência e mudanças de um ano para outro. [ONS: Line chart](https://service-manual.ons.gov.uk/data-visualisation/chart-types/line-chart) | A ligação destaca a trajetória; cada ano fica menos distinto. Para o fluxo anual, é uma alternativa se a tendência for a pergunta principal. |
| Barras horizontais | Ler todos os anos e seus totais em tela estreita. [Analysis Function: Bar charts](https://analysisfunction.civilservice.gov.uk/policy-store/data-visualisation-charts/#section-8) | A cronologia passa a ser lida de cima para baixo, e a lista fica mais alta. |
| Pontos ou hastes com pontos (*lollipop*) | Comparar posições em uma escala comum com menos preenchimento visual. [Datawrapper: Dot plots](https://academy.datawrapper.de/article/188-how-to-create-a-dot-plot) · [From Data to Viz: Lollipop](https://www.data-to-viz.com/graph/lollipop.html) | Em uma ordem que não pode ser reorganizada, como a cronológica, a própria documentação de *lollipop* indica que barras podem ser mais fáceis de ler. |
| Unidades (um quadrado por livro) | Mostrar contagens pequenas e dar um significado concreto a cada marca. [Observable Plot: Waffle mark](https://github.com/observablehq/plot/blob/main/docs/marks/waffle.md) | Com muitas aquisições, contar marcas torna-se trabalhoso; agrupar várias unidades por quadrado elimina a correspondência de um livro por marca. |
| Linha acumulada | Ver como cresceu o total de aquisições registradas até cada ano. [ONS: estoques e fluxos](https://service-manual.ons.gov.uk/data-visualisation/chart-types/choosing-a-chart-type#stock-or-flow-data-in-change-over-time-charts) | Responde a outra pergunta: esconde o volume anual na inclinação. Não é substituta do gráfico principal. |

## O que o dado permite afirmar

O gráfico descreve os **livros cadastrados com data de aquisição registrada**. Uma data ausente não informa o ano de compra; esses livros devem ficar fora da série e, quando houver, ser indicados separadamente. Um zero entre anos significa zero aquisições registradas naquele ano, não prova que nenhuma aquisição aconteceu. O [ONS distingue períodos sem informação de períodos com zero](https://service-manual.ons.gov.uk/data-visualisation/chart-types/column-chart#irregular-and-missing-data).
