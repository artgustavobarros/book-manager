## ADDED Requirements

### Requirement: Escopo dos gráficos
A página Dados do acervo SHALL oferecer o escopo "Todo o acervo" ou "Apenas lidos", que afeta os gráficos por status, gênero, nacionalidade e editora, e a legenda do topo.

#### Scenario: Apenas lidos
- **WHEN** o usuário escolhe "Apenas lidos"
- **THEN** a legenda vira "Gráficos calculados apenas com os N livros lidos" e os gráficos usam só os lidos

### Requirement: KPIs de dados
A página SHALL mostrar 4 KPIs: Páginas lidas, Páginas na estante (com estimativa para livros sem nº de páginas), Leitura concluída (%) e Diversidade literária (países · editoras · gêneros), com os cálculos de `dados()` no standalone.

#### Scenario: Livros sem nº de páginas
- **WHEN** 3 livros não têm nº de páginas
- **THEN** o KPI "Páginas na estante" mostra a estimativa "~N estimadas, contando 3 livros sem nº de páginas"

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
A página SHALL mostrar barras horizontais ordenadas por contagem (empate em ordem alfabética), exibindo 7 itens e "Mostrar todos (N)" / "Mostrar menos". Valores vazios MUST aparecer como "Não informado". Clicar numa barra MUST abrir a Estante com a faceta correspondente.

#### Scenario: Expandir gêneros
- **WHEN** há 10 gêneros e o usuário clica em "Mostrar todos (10)"
- **THEN** os 10 aparecem e o botão vira "Mostrar menos"

### Requirement: Lidos por ano
A página SHALL mostrar colunas dos últimos até 8 anos com livros lidos, com destaque de acento no ano corrente e o total de páginas no selo. Clicar numa coluna MUST abrir a Estante filtrada pelos lidos naquele ano.

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
