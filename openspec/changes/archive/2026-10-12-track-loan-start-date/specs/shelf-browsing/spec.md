## MODIFIED Requirements

### Requirement: Filtro rápido e badge informativa de empréstimos na Estante
A Estante SHALL disponibilizar acesso direto ou chip de filtro para listar apenas os livros com status "emprestado". O badge de empréstimo nos cards e linhas MUST ser clicável para exibir os dados do empréstimo ou acionar a devolução. O tempo exibido no badge ("hoje", "há N dias", "há N meses") MUST ser contado a partir do início do empréstimo (`lentAt`), em dias de calendário no fuso do usuário, com a mesma regra do detalhamento de empréstimos do Painel.

#### Scenario: Filtrar por livros emprestados
- **WHEN** o usuário seleciona o filtro de empréstimos na Estante
- **THEN** apenas os livros atualmente emprestados são exibidos na lista/capas com a pessoa que pegou em destaque

#### Scenario: Favoritar não altera o tempo do badge
- **WHEN** o usuário favorita na Estante um livro emprestado há 5 dias
- **THEN** o badge do card e da linha continua "Com <nome> · há 5 dias"
