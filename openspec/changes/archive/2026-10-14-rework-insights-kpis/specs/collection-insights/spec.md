## MODIFIED Requirements

### Requirement: Escopo dos gráficos
A página Dados do acervo SHALL oferecer o escopo "Todo o acervo" ou "Apenas lidos", que afeta os gráficos por status, gênero, nacionalidade e editora. O controle segmentado de escopo MUST ficar numa linha com o título "Gráficos", logo acima da grade de gráficos e abaixo dos KPIs, e MUST NOT ficar no cabeçalho da página. Os KPIs MUST NOT mudar com o escopo. A página MUST NOT mostrar legenda de escopo ("Gráficos calculados…"); o controle segmentado é a única indicação do escopo ativo. Em toda a página (escopo, KPIs, páginas lidas, lidos por ano e atribuição de ano), um livro MUST contar como lido quando tem status `lido` ou quando tem status `emprestado` e ano lido preenchido.

#### Scenario: Apenas lidos
- **WHEN** o usuário escolhe "Apenas lidos"
- **THEN** "Apenas lidos" fica ativo no controle segmentado, os gráficos usam só os lidos, os KPIs mantêm os mesmos valores e nenhuma frase "Gráficos calculados…" aparece

#### Scenario: Todo o acervo sem legenda
- **WHEN** o usuário abre Dados do acervo com o escopo padrão
- **THEN** o cabeçalho mostra só o título "Dados do acervo", e o controle segmentado aparece ao lado do título "Gráficos", entre os KPIs e a grade de gráficos

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

### Requirement: Tipografia dos KPIs de dados
Os KPIs de Dados do acervo (Páginas na estante, Gênero mais lido, Ritmo de leitura e Países de origem) SHALL usar a mesma tipografia, as mesmas cores e o mesmo espaçamento interno dos KPIs do Painel e do card "Meta de leitura": título em `font-semibold text-base` na tinta do tema, número em `font-title` negrito `text-5xl` e subtítulo em `text-base` na cor `--mute` (o estilo de "de 24 livros lidos"). Quando o valor é uma palavra, e não um número (o gênero de "Gênero mais lido"), ele MUST usar `font-title` negrito em `text-3xl`, numa única linha truncada com reticências e com o texto completo disponível ao passar o ponteiro, sem aumentar a largura do card.

#### Scenario: KPI de dados no padrão do Painel
- **WHEN** o usuário abre Dados do acervo
- **THEN** "Páginas na estante", o total de páginas e "somando X de N livros" aparecem com o mesmo tamanho, peso e cor do título, do número e do subtítulo dos KPIs do Painel

#### Scenario: Gênero com nome longo
- **WHEN** o gênero mais lido é "Ficção científica e fantasia" e a tela tem 390px
- **THEN** o valor aparece em uma linha, truncado com reticências, e o card não fica mais largo nem mais alto que os outros KPIs
