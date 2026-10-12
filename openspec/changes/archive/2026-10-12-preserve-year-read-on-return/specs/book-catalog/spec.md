## MODIFIED Requirements

### Requirement: Fluxo ágil de empréstimo e devolução
O sistema SHALL disponibilizar ação direta de "Emprestar" e "Devolver" para qualquer livro do acervo. A ação de emprestar MUST solicitar o nome da pessoa e opcionalmente a data do empréstimo (padrão hoje). A ação de devolver MUST levar o status para "lido" quando o livro tem ano de leitura e para "não lido" quando não tem, limpar o campo de quem pegou emprestado e registrar a devolução de forma atômica. A devolução MUST NOT alterar o ano de leitura. Quando um livro entra no status "emprestado", por qualquer caminho (ação de emprestar, seletor de status, ficha, criação já emprestado, edição em lote ou merge da planilha), o sistema MUST gravar o instante atual como início do empréstimo. Enquanto o livro continua emprestado, outras edições (favorito, anotações, capa, nome de quem pegou ou um novo envio do mesmo status) MUST manter o início do empréstimo. Quando o livro sai do status "emprestado", o início do empréstimo MUST ser limpo.

#### Scenario: Emprestar livro rapidamente
- **WHEN** o usuário aciona "Emprestar", informa "Lucas" e confirma
- **THEN** o livro passa a ter status "emprestado", com borrower "Lucas", e a data atual é associada

#### Scenario: Devolver livro em um clique
- **WHEN** o usuário clica em "Registrar devolução" em um livro emprestado
- **THEN** o status deixa de ser "emprestado", o nome de quem pegou é desassociado, o início do empréstimo é limpo e a Estante atualiza sem recarregar

#### Scenario: Devolver livro lido mantém o ano de leitura
- **WHEN** um livro `lido` com ano de leitura 2026 é emprestado e depois devolvido pelo ✕ do badge
- **THEN** o livro volta para `lido`, continua com ano de leitura 2026 e continua contando na meta de 2026

#### Scenario: Devolver livro sem ano de leitura
- **WHEN** um livro emprestado sem ano de leitura é devolvido
- **THEN** o livro volta para "não lido" e continua sem ano de leitura

#### Scenario: Editar livro emprestado não reinicia o empréstimo
- **WHEN** um livro emprestado há 10 dias é favoritado, tem as anotações editadas ou recebe uma capa da busca automática
- **THEN** o início do empréstimo continua o mesmo e o rótulo segue "há 10 dias"

#### Scenario: Reemprestar depois da devolução
- **WHEN** um livro é devolvido e, dias depois, emprestado de novo
- **THEN** o início do empréstimo passa a ser o instante do novo empréstimo
