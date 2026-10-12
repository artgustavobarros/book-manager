## ADDED Requirements

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
