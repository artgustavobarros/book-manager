# book-catalog Specification

## Purpose
TBD - created by archiving change bodega-literaria-app. Update Purpose after archive.
## Requirements
### Requirement: Modelo de dados do livro
O sistema SHALL armazenar para cada livro: id, dono (`user_id`), nº de ordem (inteiro), título (obrigatório), autor(a), gênero do autor(a) (`Homem` | `Mulher` | `Não definido` | vazio), cor/etnia do autor(a) (texto livre), nacionalidade, editora, gênero da obra, ano de lançamento (inteiro), páginas (inteiro), data de aquisição (data), status (`nao-lido` | `lendo` | `lido` | `emprestado` | `abandonado` | `doado`), emprestado para (texto), início do empréstimo (data e hora, `lentAt`), ano em que foi lido (inteiro), anotações, URL da capa, favorito (booleano), marcador de capa já buscada, e datas de criação e atualização. O início do empréstimo MUST ser controlado pelo servidor: a API MUST devolvê-lo e MUST ignorar um valor enviado pelo cliente na criação e na edição.

#### Scenario: Campos numéricos inválidos
- **WHEN** a API recebe páginas, ano de lançamento ou ano lido que não são inteiros positivos
- **THEN** o valor é rejeitado com 400 e a mensagem do campo correspondente

#### Scenario: Título ausente
- **WHEN** a API recebe um livro sem título (após trim)
- **THEN** a criação é rejeitada com 400

#### Scenario: Cliente tenta definir o início do empréstimo
- **WHEN** a API recebe um `PATCH` com `lentAt: "2020-01-01T00:00:00Z"` para um livro emprestado
- **THEN** o `lentAt` gravado e devolvido continua o mesmo de antes da requisição

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
O sistema SHALL oferecer o modal "Registrar livro" / "Editar ficha" com todos os campos do modelo, a prévia da capa (gerada a partir de título e autor quando não houver imagem), a busca online e os botões Cancelar e Salvar. Apenas o título MUST ser marcado como obrigatório, de acordo com o contrato da API; Autor(a) MUST aparecer como opcional. Salvar MUST ficar visualmente inativo (opacidade 40%) enquanto o título estiver vazio. Ao enviar dados inválidos, cada erro MUST aparecer junto ao campo correspondente e o foco MUST ir ao primeiro campo inválido, preservando os valores preenchidos. O fechamento com alterações não salvas segue a confirmação definida em `app-shell`.

O campo "Gênero do autor(a)" MUST ser um combobox de escolha única no visual do combobox do app (e não um `<select>` nativo), com as opções "—", "Homem", "Mulher" e "Não definido", operável por teclado (setas, Enter ou Espaço para abrir/escolher, Esc para fechar só a lista). O campo "Nacionalidade do autor" MUST ser um autocomplete no mesmo visual, com as nacionalidades já usadas no acervo em ordem alfabética pt-BR, filtro que ignora maiúsculas e acentos e, quando o texto digitado não existir na lista, a opção "Adicionar “<texto>”". Sem nacionalidades cadastradas e sem texto, a lista MUST mostrar "Digite para adicionar uma nacionalidade.". Os dois campos MUST continuar salvando texto, sem mudança na API.

#### Scenario: Registrar livro
- **WHEN** o usuário preenche ao menos o título e clica em "Salvar"
- **THEN** o livro é criado, o modal fecha, aparece o toast "Livro registrado no acervo" e o livro surge no topo de "Últimos adicionados" quando tiver data de aquisição recente

#### Scenario: Autor desconhecido
- **WHEN** o usuário registra um livro com título e deixa Autor(a) em branco
- **THEN** o formulário informa que Autor(a) é opcional e aceita o registro sem mostrar erro nesse campo

#### Scenario: Corrigir campo inválido
- **WHEN** o usuário informa uma URL de capa inválida e tenta salvar
- **THEN** o erro aparece junto de "Capa (link da imagem)", o foco vai para esse campo e os demais valores permanecem

#### Scenario: Status lido sem ano
- **WHEN** o usuário seleciona o status "Lido" num livro sem "Ano em que foi lido"
- **THEN** o ano lido é preenchido com o ano corrente

#### Scenario: Escolher o gênero do autor
- **WHEN** o usuário abre "Gênero do autor(a)", escolhe "Mulher" e salva
- **THEN** a lista fecha mostrando "Mulher" e o livro é salvo com `authorGender` "Mulher"

#### Scenario: Nacionalidade existente
- **WHEN** o acervo tem livros com nacionalidade "nigeriana" e o usuário digita "nige" em "Nacionalidade do autor"
- **THEN** a lista mostra "nigeriana" e escolher a opção preenche o campo

#### Scenario: Nacionalidade nova
- **WHEN** o usuário digita "cabo-verdiana", que não existe no acervo, e escolhe "Adicionar “cabo-verdiana”"
- **THEN** o campo fica com "cabo-verdiana", a lista fecha e, ao salvar, o livro fica com essa nacionalidade

### Requirement: Sugestões de gênero da obra
No formulário da ficha, o campo "Gênero da obra" SHALL ser um autocomplete no visual do combobox do app (popup `bg-card` com borda `line2`, itens com destaque `bg-hov`, seta à direita), e não uma lista nativa do navegador. As sugestões MUST reunir a lista base de gêneros e os gêneros já usados no acervo, sem repetição e em ordem alfabética pt-BR. O campo MUST aceitar texto livre: escolher uma sugestão é opcional e o valor salvo é o texto do campo. Clicar no campo ou na seta MUST abrir as sugestões; digitar MUST filtrá-las ignorando maiúsculas e acentos. Escolher uma sugestão MUST preencher o campo e fechar a lista. O autocomplete MUST ser operável pelo teclado (setas, Enter para escolher, Esc para fechar a lista sem fechar o modal), e preencher o gênero pela busca online MUST atualizar o campo.

#### Scenario: Escolher uma sugestão
- **WHEN** o usuário clica em "Gênero da obra" e escolhe "Fantasia" na lista
- **THEN** o campo passa a mostrar "Fantasia", a lista fecha e, ao salvar, o livro fica com o gênero "Fantasia"

#### Scenario: Digitar para filtrar
- **WHEN** o usuário digita "ficcao" em "Gênero da obra"
- **THEN** a lista mostra só as sugestões que contêm "Ficção" (ex.: "Ficção científica e distopia"), sem diferenciar acentos

#### Scenario: Gênero novo
- **WHEN** o usuário digita "Cordel", que não está entre as sugestões, e salva
- **THEN** a lista avisa "Nenhuma sugestão. O gênero fica como digitado." e o livro é salvo com o gênero "Cordel"

#### Scenario: Esc fecha só a lista
- **WHEN** a lista de gêneros está aberta e o usuário pressiona Esc
- **THEN** a lista fecha, o modal continua aberto e o foco fica em "Gênero da obra"

#### Scenario: Preenchido pela busca online
- **WHEN** o usuário escolhe um resultado da busca online que traz o gênero "Romance"
- **THEN** "Gênero da obra" mostra "Romance"

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
O sistema SHALL permitir marcar e desmarcar favorito pela ação ♥/♡ da capa, mostrando o ♥ sobre a capa quando o livro for favorito e não estiver em hover. Os toasts MUST ser "Adicionado aos favoritos" e "Removido dos favoritos", sem emoji.

#### Scenario: Favoritar
- **WHEN** o usuário clica em ♡ num livro
- **THEN** o livro vira favorito e aparece o toast de sucesso "Adicionado aos favoritos"

### Requirement: Excluir livro
O sistema SHALL excluir um livro pelo modal (dois cliques: "Excluir livro" → "Confirmar exclusão") ou pela ação ✕ da lista, com confirmação. Após excluir, o toast "Livro excluído" MUST ser do tipo informação.

#### Scenario: Exclusão pelo modal
- **WHEN** o usuário clica em "Excluir livro" e depois em "Confirmar exclusão"
- **THEN** o livro é removido, o modal fecha e aparece o toast informativo "Livro excluído"

### Requirement: Fluxo ágil de empréstimo e devolução
O sistema SHALL disponibilizar ação direta de "Emprestar" e "Devolver" para qualquer livro do acervo. A ação de emprestar MUST solicitar o nome da pessoa e opcionalmente a data do empréstimo (padrão hoje). A ação de devolver MUST reverter o status para "lido" ou "quero-ler", limpar o campo de quem pegou emprestado e registrar a devolução de forma atômica. Quando um livro entra no status "emprestado", por qualquer caminho (ação de emprestar, seletor de status, ficha, criação já emprestado, edição em lote ou merge da planilha), o sistema MUST gravar o instante atual como início do empréstimo. Enquanto o livro continua emprestado, outras edições (favorito, anotações, capa, nome de quem pegou ou um novo envio do mesmo status) MUST manter o início do empréstimo. Quando o livro sai do status "emprestado", o início do empréstimo MUST ser limpo.

#### Scenario: Emprestar livro rapidamente
- **WHEN** o usuário aciona "Emprestar", informa "Lucas" e confirma
- **THEN** o livro passa a ter status "emprestado", com borrower "Lucas", e a data atual é associada

#### Scenario: Devolver livro em um clique
- **WHEN** o usuário clica em "Registrar devolução" em um livro emprestado
- **THEN** o status deixa de ser "emprestado", o nome de quem pegou é desassociado, o início do empréstimo é limpo e a Estante atualiza sem recarregar

#### Scenario: Editar livro emprestado não reinicia o empréstimo
- **WHEN** um livro emprestado há 10 dias é favoritado, tem as anotações editadas ou recebe uma capa da busca automática
- **THEN** o início do empréstimo continua o mesmo e o rótulo segue "há 10 dias"

#### Scenario: Reemprestar depois da devolução
- **WHEN** um livro é devolvido e, dias depois, emprestado de novo
- **THEN** o início do empréstimo passa a ser o instante do novo empréstimo

### Requirement: Adaptação de formulários a teclados virtuais
Os modais de formulário do catálogo (Registrar livro e Editar ficha) SHALL manter a barra inferior de ações (Salvar e Cancelar) visível e fixada ou facilmente rolável quando o teclado virtual estiver ativo no dispositivo móvel, evitando que o campo focado empurre os botões para fora do viewport visível.

#### Scenario: Preenchimento de formulário com teclado virtual
- **WHEN** o usuário toca em um campo de texto no modal em dispositivo móvel
- **THEN** o teclado virtual abre sem ocultar os botões de ação ou sem impedir o acesso ao botão Salvar

