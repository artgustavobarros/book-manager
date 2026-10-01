## ADDED Requirements

### Requirement: Exportar CSV
O sistema SHALL gerar, pelo rodapé "Exportar Excel (CSV)", um arquivo `acervo-AAAA-MM-DD.csv` com separador `;`, UTF-8 com BOM, CRLF, ordenado pelo nº de ordem, com as colunas do standalone mais "Cor/etnia do autor(a)", status por rótulo e data de aquisição em DD/MM/AAAA.

#### Scenario: Exportação
- **WHEN** o usuário clica em "Exportar Excel (CSV)"
- **THEN** o arquivo é baixado, abre corretamente acentuado no Excel e aparece o toast "Planilha CSV exportada"

### Requirement: Salvar backup JSON
O sistema SHALL gerar, por "Salvar backup", um arquivo `acervo-AAAA-MM-DD.json` com o array de livros do usuário num formato compatível com o backup do standalone (chaves `order`, `title`, `author`, … e valores serializados como no standalone).

#### Scenario: Backup
- **WHEN** o usuário clica em "Salvar backup"
- **THEN** o JSON baixado contém todos os livros do usuário e nenhum dado de autenticação

### Requirement: Restaurar backup JSON
O sistema SHALL restaurar um backup JSON (deste app ou do standalone) via `POST /api/books/import`, substituindo o acervo do usuário numa operação atômica. Entradas sem título MUST ser ignoradas, valores em string MUST ser convertidos para os tipos do modelo e nºs ausentes MUST ser atribuídos como em `withOrders`. Como a operação é destrutiva, ela MUST pedir confirmação antes de substituir um acervo não vazio.

#### Scenario: Restaurar backup do standalone
- **WHEN** o usuário restaura um JSON exportado do standalone, com `pages: "416"` e `fav: true`
- **THEN** os livros são importados com páginas 416 (inteiro) e favorito marcado, e aparece o toast "Backup restaurado · N livros"

#### Scenario: Arquivo inválido
- **WHEN** o arquivo não é JSON ou não é um array
- **THEN** nada é alterado e a UI mostra "Arquivo inválido." no padrão de toast/erro do app (não `alert`)

#### Scenario: Restaurar pelo estado vazio
- **WHEN** um usuário sem livros clica em "Restaurar backup" no estado vazio da Estante ou dos Dados
- **THEN** abre o seletor de arquivo e a restauração segue sem pedir confirmação de substituição
