## MODIFIED Requirements

### Requirement: Escopo dos gráficos
A página Dados do acervo SHALL oferecer o escopo "Todo o acervo" ou "Apenas lidos", que afeta os gráficos por status, gênero, nacionalidade e editora, e a legenda do topo. Em toda a página (escopo, KPIs, páginas lidas, lidos por ano e atribuição de ano), um livro MUST contar como lido quando tem status `lido` ou quando tem status `emprestado` e ano lido preenchido.

#### Scenario: Apenas lidos
- **WHEN** o usuário escolhe "Apenas lidos"
- **THEN** a legenda vira "Gráficos calculados apenas com os N livros lidos" e os gráficos usam só os lidos

#### Scenario: Livro lido emprestado
- **WHEN** um livro `lido` em 2026, com 200 páginas, é emprestado
- **THEN** ele continua contando na coluna de 2026 de "Lidos por ano" e nas páginas lidas
