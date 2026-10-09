## MODIFIED Requirements

### Requirement: Restaurar backup JSON
O sistema SHALL restaurar um backup JSON (deste app ou do standalone) via `POST /api/books/import`, substituindo o acervo do usuário numa operação atômica. Entradas sem título MUST ser ignoradas, valores em string MUST ser convertidos para os tipos do modelo e nºs ausentes MUST ser atribuídos como em `withOrders`. Como a operação é destrutiva, um backup sem nenhum livro com título MUST ser rejeitado (400 "Arquivo inválido." no servidor, sem tocar o acervo), e a restauração MUST pedir confirmação antes de substituir um acervo não vazio, informando quantos livros válidos serão restaurados e quantos itens serão ignorados. Falhas MUST aparecer como toast de erro "Não foi possível restaurar o backup", com a nota "O arquivo escolhido não é um backup válido da Bodega Literária." para arquivo inválido ou com a mensagem do servidor nos demais casos.

#### Scenario: Restaurar backup do standalone
- **WHEN** o usuário restaura um JSON exportado do standalone, com `pages: "416"` e `fav: true`
- **THEN** os livros são importados com páginas 416 (inteiro) e favorito marcado, e aparece o toast "Backup restaurado · N livros"

#### Scenario: Arquivo inválido
- **WHEN** o arquivo não é JSON ou não é um array
- **THEN** nada é alterado e aparece o toast de erro "Não foi possível restaurar o backup" com a nota "O arquivo escolhido não é um backup válido da Bodega Literária." (não `alert`)

#### Scenario: Backup sem livros válidos
- **WHEN** o arquivo é um array vazio ou só tem itens sem título (ex.: `[{"foo":1}]`), ou `POST /api/books/import` recebe esse conteúdo
- **THEN** a API responde 400 "Arquivo inválido.", o acervo continua intacto e, na interface, aparece o toast de arquivo inválido sem pedir confirmação

#### Scenario: Backup com itens ignorados
- **WHEN** um usuário com livros restaura um arquivo com 3 itens, 1 deles sem título
- **THEN** a confirmação informa "O backup tem 2 livros (1 item ignorado) e vai substituir os N livros atuais"

#### Scenario: Restaurar pelo estado vazio
- **WHEN** um usuário sem livros clica em "Restaurar backup" no estado vazio da Estante ou dos Dados
- **THEN** abre o seletor de arquivo e a restauração segue sem pedir confirmação de substituição
