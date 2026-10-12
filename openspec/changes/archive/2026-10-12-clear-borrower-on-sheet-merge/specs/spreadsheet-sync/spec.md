## MODIFIED Requirements

### Requirement: Merge que preserva dados locais
O merge SHALL casar cada linha com um livro existente pelo nº de ordem (se o título normalizado também bater) ou por título + autor normalizados. Para livros casados, os campos não vazios da planilha MUST sobrescrever os do app, exceto anotações, capa, páginas e ano lido, que MUST ser preservados quando já preenchidos no app. Linhas sem correspondência MUST criar livros novos (status padrão `nao-lido`, nº da planilha se livre, senão o próximo). Livros casados ou criados cujo status final não seja "emprestado" MUST ficar sem quem pegou emprestado, mesmo que a planilha traga um nome na coluna "Emprestado para".

#### Scenario: Atualizar livro existente
- **WHEN** a planilha traz um livro já existente com outra editora, e o app tem anotações nele
- **THEN** a editora é atualizada e as anotações são mantidas

#### Scenario: Livro devolvido na planilha
- **WHEN** um livro emprestado a Joana no app aparece na planilha com status "Lido" e "Joana" em "Emprestado para"
- **THEN** o livro passa a `lido`, sem quem pegou emprestado e sem início do empréstimo

#### Scenario: Nome em livro não emprestado
- **WHEN** a planilha traz "Lucas" em "Emprestado para" num livro novo ou existente cujo status final é "Lido"
- **THEN** o livro fica sem quem pegou emprestado

#### Scenario: Livro continua emprestado
- **WHEN** um livro emprestado a Joana aparece na planilha com o status vazio e "Lucas" em "Emprestado para"
- **THEN** o livro continua emprestado, agora a Lucas, com o mesmo início do empréstimo

#### Scenario: Resultado
- **WHEN** a sincronização termina
- **THEN** aparece "Sincronizado: N livros atualizados e M novos.", o toast "Planilha sincronizada" e a Estante reflete os dados novos
