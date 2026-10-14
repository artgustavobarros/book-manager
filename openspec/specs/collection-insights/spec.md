# collection-insights Specification

## Purpose
TBD - created by archiving change bodega-literaria-app. Update Purpose after archive.
## Requirements
### Requirement: Escopo dos gráficos
A página Dados do acervo SHALL oferecer o escopo "Todo o acervo" ou "Apenas lidos", que afeta os gráficos por status, gênero, nacionalidade e editora. O controle segmentado de escopo MUST ficar logo acima da grade de gráficos e abaixo dos KPIs, ocupando a largura toda do conteúdo, com as duas opções dividindo o espaço igualmente, sem título ao lado, e MUST NOT ficar no cabeçalho da página. Os KPIs MUST NOT mudar com o escopo. A página MUST NOT mostrar legenda de escopo ("Gráficos calculados…"); o controle segmentado é a única indicação do escopo ativo. Em toda a página (escopo, KPIs, páginas lidas, lidos por ano e atribuição de ano), um livro MUST contar como lido quando tem status `lido` ou quando tem status `emprestado` e ano lido preenchido.

#### Scenario: Apenas lidos
- **WHEN** o usuário escolhe "Apenas lidos"
- **THEN** "Apenas lidos" fica ativo no controle segmentado, os gráficos usam só os lidos, os KPIs mantêm os mesmos valores e nenhuma frase "Gráficos calculados…" aparece

#### Scenario: Todo o acervo sem legenda
- **WHEN** o usuário abre Dados do acervo com o escopo padrão
- **THEN** o cabeçalho mostra só o título "Dados do acervo", e o controle segmentado aparece na largura toda, sem título, entre os KPIs e a grade de gráficos

#### Scenario: Livro lido emprestado
- **WHEN** um livro `lido` em 2026, com 200 páginas, é emprestado
- **THEN** ele continua contando na coluna de 2026 de "Lidos por ano" e nas páginas lidas

### Requirement: KPIs de dados
A página SHALL mostrar 4 KPIs, nesta ordem: Páginas na estante, Gênero mais lido, Ritmo de leitura e Países de origem. Cada KPI MUST ter um subtítulo de uma frase curta que dá referência ao valor, sem o separador "·", sem as abreviações "p.", "nº" e "~", e com singular e plural corretos. Os KPIs MUST considerar o acervo todo, independentemente do escopo dos gráficos.

- **Páginas na estante**: o valor é a soma das páginas dos livros com nº de páginas informado. O subtítulo é "somando X de N livros" quando faltam páginas em algum livro; "somando os N livros" quando todos têm páginas (N ≥ 2); "somando 1 livro" quando o acervo tem um único livro, com páginas. Sem nenhum livro com páginas, o valor é "—" e o subtítulo é "nenhum livro com páginas informadas".
- **Gênero mais lido**: o valor é o gênero com mais livros lidos, agrupando pela mesma normalização dos gráficos (sem diferenciar maiúsculas nem espaços nas pontas) e exibindo o rótulo usado no gráfico de gêneros. "Não informado" MUST NOT contar. Em caso de empate vence o primeiro em ordem alfabética. O subtítulo é "N dos M lidos", sendo M o total de livros lidos; com um único livro lido, "o único lido". Sem livros lidos, o valor é "—" e o subtítulo é "nenhum livro lido ainda"; com lidos, mas nenhum com gênero, o valor é "—" e o subtítulo é "nenhum lido com gênero informado".
- **Ritmo de leitura**: o valor é o número de livros lidos com ano lido dividido pelo número de anos do primeiro ano lido registrado até o ano atual, inclusive, com no máximo uma casa decimal no formato pt-BR (por exemplo, "3,2" ou "4"). O subtítulo é "livros por ano desde AAAA", com "livro" no singular quando o valor é menor que 2. Quando o primeiro ano lido é o ano atual, o subtítulo é "livros lidos em AAAA" ("livro lido" no singular). Sem livros lidos com ano, o valor é "—" e o subtítulo é "registre o ano de leitura dos lidos".
- **Países de origem**: o valor é o número de nacionalidades distintas dos autores (sem diferenciar maiúsculas, ignorando vazios), e o subtítulo é "entre os autores do acervo". Sem nenhuma nacionalidade informada, o valor é "—" e o subtítulo é "nenhuma nacionalidade informada".

#### Scenario: Livros sem nº de páginas
- **WHEN** o acervo tem 120 livros e 12 deles não têm nº de páginas
- **THEN** o KPI "Páginas na estante" mostra a soma das páginas dos outros 108 e o subtítulo "somando 108 de 120 livros", sem estimativa

#### Scenario: Todos com páginas
- **WHEN** todos os 40 livros do acervo têm nº de páginas
- **THEN** o subtítulo de "Páginas na estante" é "somando os 40 livros"

#### Scenario: Gênero mais lido com empate
- **WHEN** há 45 livros lidos, 18 de "Romance" e 18 de "Ensaio"
- **THEN** o KPI "Gênero mais lido" mostra "Ensaio" e o subtítulo "18 dos 45 lidos"

#### Scenario: Gênero sem informação não conta
- **WHEN** os lidos são 5 sem gênero e 2 de "Poesia"
- **THEN** o KPI "Gênero mais lido" mostra "Poesia" e "2 dos 7 lidos"

#### Scenario: Ritmo de leitura desde o primeiro ano
- **WHEN** o ano atual é 2026 e há 16 livros lidos com ano entre 2022 e 2026
- **THEN** o KPI "Ritmo de leitura" mostra "3,2" e o subtítulo "livros por ano desde 2022"

#### Scenario: Ritmo de leitura só no ano atual
- **WHEN** o ano atual é 2026 e os 3 livros lidos com ano são de 2026
- **THEN** o KPI "Ritmo de leitura" mostra "3" e o subtítulo "livros lidos em 2026"

#### Scenario: Ritmo de leitura sem ano lido
- **WHEN** há livros lidos, mas nenhum tem ano de leitura
- **THEN** o KPI "Ritmo de leitura" mostra "—" e o subtítulo "registre o ano de leitura dos lidos"

#### Scenario: Países de origem
- **WHEN** os autores do acervo têm as nacionalidades "brasileira", "Brasileira", "russa" e uma vazia
- **THEN** o KPI "Países de origem" mostra "2" e o subtítulo "entre os autores do acervo"

### Requirement: Páginas lidas e calhamaços
A página SHALL mostrar o termômetro de páginas lidas sobre a estimativa total e o top 5 dos maiores livros lidos.

#### Scenario: Sem páginas registradas
- **WHEN** nenhum livro lido tem nº de páginas
- **THEN** aparece "Registre o número de páginas dos livros lidos."

### Requirement: Livros por status
A página SHALL mostrar um donut (conic-gradient) com as cores de status e a legenda com barra, contagem e porcentagem. Clicar num status MUST levar à Estante filtrada por ele.

#### Scenario: Clicar em um status
- **WHEN** o usuário clica em "Emprestado" na legenda
- **THEN** a Estante abre com o chip "Emprestados" ativo

### Requirement: Barras por gênero, nacionalidade e editora
A página SHALL mostrar barras horizontais ordenadas por contagem (empate em ordem alfabética), exibindo 7 itens e "Mostrar todos (N)" / "Mostrar menos". Valores vazios MUST aparecer como "Não informado". Clicar numa barra MUST abrir a Estante com a faceta correspondente. As barras dos três gráficos MUST usar a mesma cor de acento do projeto (`--acc`).

#### Scenario: Expandir gêneros
- **WHEN** há 10 gêneros e o usuário clica em "Mostrar todos (10)"
- **THEN** os 10 aparecem e o botão vira "Mostrar menos"

#### Scenario: Cor única nas barras
- **WHEN** o usuário abre Dados do acervo, no tema claro ou escuro
- **THEN** as barras de gênero, nacionalidade e editora têm a mesma cor de acento do tema, sem barras pretas ou cinzas

### Requirement: Lidos por ano
A página SHALL mostrar colunas dos últimos até 8 anos com livros lidos, com o total de páginas no selo. A coluna do ano corrente MUST usar a cor de acento plena (`--acc`) e as demais MUST usar a cor de acento atenuada (misturada ao fundo), sem preto. Clicar numa coluna MUST abrir a Estante filtrada pelos lidos naquele ano.

#### Scenario: Destaque do ano corrente
- **WHEN** há livros lidos em 2025 e 2026 e o ano corrente é 2026
- **THEN** a coluna de 2026 aparece na cor de acento plena e a de 2025 na mesma cor atenuada

#### Scenario: Sem anos atribuídos
- **WHEN** nenhum livro lido tem ano de leitura
- **THEN** aparece "Atribua o ano de leitura abaixo para ver o gráfico."

### Requirement: Atribuir ano lido
A página SHALL listar os livros lidos sem ano (ou todos os lidos, pelo controle segmentado), com botões para os últimos 5 anos. Clicar num ano MUST atribuí-lo (ou removê-lo, se já for o atual) e persistir. A lista mostra 6 itens, com "Mostrar todos (N)".

#### Scenario: Atribuir 2025
- **WHEN** o usuário clica em "2025" num livro sem ano
- **THEN** o ano lido vira 2025, aparece o toast "<título> · lido em 2025" e o livro sai da lista "Sem ano"

### Requirement: Estado vazio de Dados
Com o acervo vazio, a página SHALL substituir todo o conteúdo pelo estado "Ainda não há dados para mostrar", com as ações "+ Registrar livro", "Sincronizar planilha" e "Restaurar backup".

#### Scenario: Conta nova
- **WHEN** um usuário sem livros abre Dados do acervo
- **THEN** só o título da página e o estado vazio aparecem

### Requirement: Carrosséis de Dados alcançáveis por teclado
Em largura móvel, os trilhos roláveis de KPIs e gráficos em Dados SHALL ter nome acessível, receber foco e permitir alcançar todos os itens por teclado. Os controles de posição MUST indicar a posição atual e oferecer área de toque de pelo menos 44×44 px, ainda que o ponto desenhado seja menor. A interação por arraste MUST ter alternativa por botão ou teclado.

#### Scenario: Percorrer KPIs com teclado
- **WHEN** o usuário a 390px navega com Tab até o carrossel de KPIs e usa o teclado
- **THEN** ele consegue revelar e acessar cada KPI, com indicação da posição atual

#### Scenario: Leitor de tela anuncia o trilho
- **WHEN** um leitor de tela foca o trilho de gráficos
- **THEN** ele anuncia o nome do conjunto e que a região pode ser percorrida

#### Scenario: Auditoria de regiões roláveis
- **WHEN** axe analisa Dados a 390px nos dois temas
- **THEN** não há violação `scrollable-region-focusable`

### Requirement: Tipografia dos KPIs de dados
Os KPIs de Dados do acervo (Páginas na estante, Gênero mais lido, Ritmo de leitura e Países de origem) SHALL usar a mesma tipografia, as mesmas cores e o mesmo espaçamento interno dos KPIs do Painel e do card "Meta de leitura": título em `font-semibold text-base` na tinta do tema, número em `font-title` negrito `text-5xl` e subtítulo em `text-base` na cor `--mute` (o estilo de "de 24 livros lidos"). Quando o valor é uma palavra, e não um número (o gênero de "Gênero mais lido"), ele MUST usar `font-title` negrito em `text-3xl`, numa única linha truncada com reticências e com o texto completo disponível ao passar o ponteiro, sem aumentar a largura do card.

#### Scenario: KPI de dados no padrão do Painel
- **WHEN** o usuário abre Dados do acervo
- **THEN** "Páginas na estante", o total de páginas e "somando X de N livros" aparecem com o mesmo tamanho, peso e cor do título, do número e do subtítulo dos KPIs do Painel

#### Scenario: Gênero com nome longo
- **WHEN** o gênero mais lido é "Ficção científica e fantasia" e a tela tem 390px
- **THEN** o valor aparece em uma linha, truncado com reticências, e o card não fica mais largo nem mais alto que os outros KPIs

