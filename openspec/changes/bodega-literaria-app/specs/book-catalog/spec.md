## ADDED Requirements

### Requirement: Modelo de dados do livro
O sistema SHALL armazenar para cada livro: id, dono (`user_id`), nº de ordem (inteiro), título (obrigatório), autor(a), gênero do autor(a) (`Homem` | `Mulher` | `Não definido` | vazio), cor/etnia do autor(a) (texto livre), nacionalidade, editora, gênero da obra, ano de lançamento (inteiro), páginas (inteiro), data de aquisição (data), status (`nao-lido` | `lendo` | `lido` | `emprestado` | `abandonado` | `doado`), emprestado para (texto), ano em que foi lido (inteiro), anotações, URL da capa, favorito (booleano), marcador de capa já buscada, e datas de criação e atualização.

#### Scenario: Campos numéricos inválidos
- **WHEN** a API recebe páginas, ano de lançamento ou ano lido que não são inteiros positivos
- **THEN** o valor é rejeitado com 400 e a mensagem do campo correspondente

#### Scenario: Título ausente
- **WHEN** a API recebe um livro sem título (após trim)
- **THEN** a criação é rejeitada com 400

### Requirement: Isolamento por usuário
Toda leitura e escrita de livros SHALL ser filtrada pelo `user_id` da sessão, obtido no servidor. O `user_id` MUST NUNCA ser aceito do cliente.

#### Scenario: Tentativa de acessar livro alheio
- **WHEN** um usuário faz PATCH ou DELETE no id de um livro de outro usuário
- **THEN** a API responde 404 e o livro não é alterado

### Requirement: API REST de livros
O sistema SHALL expor Route Handlers autenticados: `GET /api/books` (todos os livros do usuário), `POST /api/books` (criar), `PATCH /api/books/:id` (atualizar campos parciais), `DELETE /api/books/:id` (excluir) e `PATCH /api/books` (atualização em lote de até 100 livros). Os payloads MUST ser validados com schemas compartilhados entre cliente e servidor.

#### Scenario: Carregar o acervo
- **WHEN** o cliente chama `GET /api/books` com sessão válida
- **THEN** recebe todos os livros do usuário, e somente eles

#### Scenario: Atualização em lote
- **WHEN** o cliente envia um lote com capas encontradas para vários livros
- **THEN** todos os livros do lote pertencentes ao usuário são atualizados numa única operação atômica

### Requirement: Nº de ordem por usuário
O sistema SHALL atribuir a um livro novo sem nº de ordem o próximo número (maior nº do usuário + 1). Livros sem nº vindos de importação MUST receber números sequenciais por ordem de data de aquisição, mantendo o comportamento de `withOrders` do standalone.

#### Scenario: Registrar sem nº
- **WHEN** o usuário salva um livro novo deixando "Nº de ordem" vazio
- **THEN** o livro recebe o maior nº do usuário + 1

### Requirement: Registrar e editar ficha
O sistema SHALL oferecer o modal "Registrar livro" / "Editar ficha" com todos os campos do modelo, a prévia da capa (gerada a partir de título e autor quando não houver imagem), a busca online e os botões Cancelar e Salvar. Salvar MUST ficar visualmente inativo (opacidade 40%) enquanto o título estiver vazio.

#### Scenario: Registrar livro
- **WHEN** o usuário preenche ao menos o título e clica em "Salvar"
- **THEN** o livro é criado, o modal fecha, aparece o toast "Livro registrado no acervo" e o livro surge no topo de "Últimos adicionados" quando tiver data de aquisição recente

#### Scenario: Status lido sem ano
- **WHEN** o usuário seleciona o status "Lido" num livro sem "Ano em que foi lido"
- **THEN** o ano lido é preenchido com o ano corrente

### Requirement: Visualizar ficha
O sistema SHALL abrir a ficha de leitura ao clicar num livro, mostrando a capa, o nº de ordem, o título, o autor (clicável para filtrar por autor), o seletor de status, o selo de empréstimo, as linhas de metadados (incluindo Cor/etnia), as anotações, "Excluir livro" e "Editar ficha".

#### Scenario: Ir da ficha à edição
- **WHEN** o usuário clica em "Editar ficha" na visualização
- **THEN** o modal muda para o modo de edição com os mesmos dados

### Requirement: Mudança de status
O sistema SHALL permitir mudar o status pelo seletor da capa, pela lista, pela ficha e pela ação ✓ da capa, com atualização otimista e toast "<título> → <status>". Ao sair do status "emprestado", o campo "emprestado para" MUST ser limpo.

#### Scenario: Marcar como emprestado
- **WHEN** o usuário escolhe "Emprestado" num seletor de status
- **THEN** abre um controle no estilo do app (não `window.prompt`) pedindo o nome da pessoa; confirmar salva status e nome, e cancelar mantém o status anterior

#### Scenario: Falha do servidor
- **WHEN** a gravação de uma mudança de status falha
- **THEN** a UI reverte para o valor anterior e mostra um toast de erro

### Requirement: Favoritos
O sistema SHALL permitir marcar e desmarcar favorito pela ação ♥/♡ da capa, mostrando o ♥ sobre a capa quando o livro for favorito e não estiver em hover.

#### Scenario: Favoritar
- **WHEN** o usuário clica em ♡ num livro
- **THEN** o livro vira favorito e aparece o toast "♥ Adicionado aos favoritos"

### Requirement: Excluir livro
O sistema SHALL excluir um livro pelo modal (dois cliques: "Excluir livro" → "Confirmar exclusão") ou pela ação ✕ da lista, com confirmação.

#### Scenario: Exclusão pelo modal
- **WHEN** o usuário clica em "Excluir livro" e depois em "Confirmar exclusão"
- **THEN** o livro é removido, o modal fecha e aparece o toast "Livro excluído"
