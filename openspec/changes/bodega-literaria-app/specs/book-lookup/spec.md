## ADDED Requirements

### Requirement: Busca online por título ou ISBN
O modal de registro e edição SHALL buscar em paralelo no Google Livros, na Open Library e no Apple Books (e, para ISBN, na capa da Amazon por ISBN-10 derivado do ISBN-13), deduplicar, priorizar resultados com capa e mostrar até 12. Com o campo vazio, a busca MUST usar o título do formulário.

#### Scenario: Busca por ISBN
- **WHEN** o usuário busca "9788554512348"
- **THEN** as fontes são consultadas pelo ISBN e, se a Amazon tiver a capa, aparece o resultado "Capa pelo ISBN 9788554512348"

#### Scenario: Escolher resultado
- **WHEN** o usuário clica num resultado
- **THEN** título, autor, editora, ano, páginas e capa disponíveis preenchem o formulário, e aparece "Dados preenchidos a partir de <fonte>. Revise antes de salvar."

#### Scenario: Todas as fontes falham
- **WHEN** todas as consultas falham
- **THEN** aparece "Não foi possível consultar os catálogos. Verifique a conexão."

### Requirement: Capas automáticas
O sistema SHALL buscar capas automaticamente para livros sem capa que ainda não foram tentados, quando suas capas entram a até 200px da viewport, com no máximo 2 buscas simultâneas (Apple → Google → Open Library, exigindo correspondência de título). Os resultados MUST ser acumulados e persistidos em lote (`PATCH /api/books`), e livros tentados sem sucesso MUST ser marcados para não serem buscados de novo.

#### Scenario: Rolagem por uma estante sem capas
- **WHEN** o usuário rola por 40 livros sem capa
- **THEN** as capas encontradas aparecem progressivamente e são gravadas em poucas requisições em lote, e não com uma requisição por livro

#### Scenario: Capa não encontrada
- **WHEN** todas as fontes respondem sem uma capa correspondente
- **THEN** o livro é marcado como tentado e mantém a capa gerada por título e autor

#### Scenario: Rede indisponível
- **WHEN** nenhuma fonte responde
- **THEN** o livro não é marcado como tentado e pode ser buscado novamente numa próxima visita
