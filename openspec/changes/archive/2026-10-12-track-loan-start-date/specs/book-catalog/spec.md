## MODIFIED Requirements

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
