## ADDED Requirements

### Requirement: Tipografia dos KPIs de dados
Os KPIs de Dados do acervo (Páginas lidas, Páginas na estante, Leitura concluída e Diversidade literária) SHALL usar a mesma tipografia, as mesmas cores e o mesmo espaçamento interno dos KPIs do Painel e do card "Meta de leitura": título em `font-semibold text-base` na tinta do tema, número em `font-title` negrito `text-5xl` e subtítulo em `text-base` na cor `--mute` (o estilo de "de 24 livros lidos").

#### Scenario: KPI de dados no padrão do Painel
- **WHEN** o usuário abre Dados do acervo
- **THEN** "Páginas lidas", "3.936" e a legenda da média aparecem com o mesmo tamanho, peso e cor do título, do número e do subtítulo dos KPIs do Painel

## MODIFIED Requirements

### Requirement: Escopo dos gráficos
A página Dados do acervo SHALL oferecer o escopo "Todo o acervo" ou "Apenas lidos", que afeta os gráficos por status, gênero, nacionalidade e editora. O topo da página MUST NOT mostrar legenda de escopo ("Gráficos calculados…"); o controle segmentado é a única indicação do escopo ativo. Em toda a página (escopo, KPIs, páginas lidas, lidos por ano e atribuição de ano), um livro MUST contar como lido quando tem status `lido` ou quando tem status `emprestado` e ano lido preenchido.

#### Scenario: Apenas lidos
- **WHEN** o usuário escolhe "Apenas lidos"
- **THEN** "Apenas lidos" fica ativo no controle segmentado, os gráficos usam só os lidos e nenhuma frase "Gráficos calculados…" aparece no topo

#### Scenario: Todo o acervo sem legenda
- **WHEN** o usuário abre Dados do acervo com o escopo padrão
- **THEN** o topo mostra só o título "Dados do acervo" e o controle segmentado, sem "Gráficos calculados com todo o acervo (N livros)"

#### Scenario: Livro lido emprestado
- **WHEN** um livro `lido` em 2026, com 200 páginas, é emprestado
- **THEN** ele continua contando na coluna de 2026 de "Lidos por ano" e nas páginas lidas

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
