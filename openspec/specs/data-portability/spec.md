# data-portability Specification

## Purpose
TBD - created by archiving change bodega-literaria-app. Update Purpose after archive.
## Requirements
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
O sistema SHALL restaurar um backup JSON (deste app ou do standalone) via `POST /api/books/import`, substituindo o acervo do usuário numa operação atômica. A rota MUST exigir sessão (401 sem sessão) e MUST substituir apenas os livros do usuário autenticado, sem tocar no acervo de outros usuários. Entradas sem título MUST ser ignoradas, valores em string MUST ser convertidos para os tipos do modelo e nºs ausentes MUST ser atribuídos como em `withOrders`, a partir de 1, já que o acervo anterior é descartado. Valores numéricos fora dos limites do modelo (nº de ordem até 1.000.000, páginas até 100.000, anos até 9999) MUST ser descartados (o livro é importado com o campo vazio), sem falhar a restauração. Como a operação é destrutiva, um backup sem nenhum livro com título MUST ser rejeitado (400 "Arquivo inválido." no servidor, sem tocar o acervo), um backup com mais de 20000 itens MUST ser rejeitado com 400 sem tocar o acervo, e a restauração MUST pedir confirmação antes de substituir um acervo não vazio, informando quantos livros válidos serão restaurados e quantos itens serão ignorados. Falhas MUST aparecer como toast de erro "Não foi possível restaurar o backup", com a nota "O arquivo escolhido não é um backup válido da Bodega Literária." para arquivo inválido ou com a mensagem do servidor nos demais casos.

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

#### Scenario: Isolamento entre usuários
- **WHEN** ana restaura um backup e bia já tem livros
- **THEN** o acervo de ana é substituído e os livros de bia continuam iguais

#### Scenario: Reimportar o mesmo backup
- **WHEN** o usuário restaura o mesmo backup de 30 livros duas vezes seguidas
- **THEN** o acervo tem 30 livros, sem duplicatas, com os nºs do backup

#### Scenario: Backup sem nº de ordem
- **WHEN** um usuário com 30 livros restaura um backup cujos itens não têm `order`
- **THEN** os livros importados são numerados a partir de 1, não a partir de 31

#### Scenario: Backup grande demais
- **WHEN** `POST /api/books/import` recebe um array com mais de 20000 itens
- **THEN** a API responde 400 e o acervo continua intacto

#### Scenario: Sem sessão
- **WHEN** `POST /api/books/import` é chamado sem sessão
- **THEN** a API responde 401 e nenhum acervo é alterado

#### Scenario: Número fora da faixa
- **WHEN** o backup tem um livro com `pages: "99999999999"` (ou ano acima de 9999, ou nº acima de 1.000.000)
- **THEN** a API responde 200, o livro é importado com aquele campo vazio (o nº é reatribuído como em `withOrders`) e os demais campos são mantidos

### Requirement: Preservar o início dos empréstimos no backup
O backup JSON SHALL incluir a chave `lentAt` (data e hora ISO 8601) nos livros com status "emprestado" que tenham início de empréstimo registrado. A chave MUST ficar fora dos demais livros. Ao restaurar, um livro emprestado MUST receber o `lentAt` do arquivo quando ele for uma data válida que não esteja no futuro. Quando o valor estiver ausente ou for inválido, como num backup antigo ou do standalone, o livro MUST receber o instante da restauração. Livros com outro status MUST ser restaurados sem início de empréstimo, mesmo que o arquivo traga `lentAt`.

#### Scenario: Ida e volta do backup
- **WHEN** o usuário salva um backup com um livro emprestado há 20 dias e o restaura em seguida
- **THEN** o livro restaurado continua emprestado e o badge mostra "há 20 dias"

#### Scenario: Backup sem a data do empréstimo
- **WHEN** o usuário restaura um backup do standalone com um livro `status: "emprestado"` e sem `lentAt`
- **THEN** o livro é restaurado emprestado, com início do empréstimo no instante da restauração ("hoje")

#### Scenario: Data inválida ou em livro não emprestado
- **WHEN** o arquivo traz `lentAt: "ontem"` num livro emprestado e `lentAt` válido num livro `lido`
- **THEN** o livro emprestado recebe o instante da restauração e o livro lido fica sem início de empréstimo, sem falhar a restauração

