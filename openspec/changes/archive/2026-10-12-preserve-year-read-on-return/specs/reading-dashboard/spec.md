## MODIFIED Requirements

### Requirement: Lidos no ano
O Painel SHALL listar as mini-capas dos livros lidos com ano lido igual ao ano corrente, cada uma abrindo a ficha. No Painel (esta lista, a meta anual e os KPIs Lidos e Páginas lidas), um livro MUST contar como lido quando tem status `lido` ou quando tem status `emprestado` e ano lido preenchido.

#### Scenario: Nenhum lido no ano
- **WHEN** não há livros lidos no ano corrente
- **THEN** aparece "Nenhum livro marcado como lido este ano ainda."

#### Scenario: Livro lido emprestado continua na meta
- **WHEN** um livro `lido` com ano lido igual ao ano corrente é emprestado
- **THEN** ele continua em "Lidos no ano" e o contador da meta não muda

#### Scenario: Emprestado sem ano lido
- **WHEN** um livro emprestado não tem ano lido
- **THEN** ele não conta na meta nem no KPI Lidos

### Requirement: Gestão ágil de leitura ativa no Painel
O Painel SHALL permitir, além do botão "Terminei" para livros em leitura, reverter o status de livros listados em "Lidos no ano" ou iniciar leitura diretamente de "Últimos adicionados", com atualizações otimistas na barra da meta anual e no indicador de ritmo. Desfazer a leitura de um livro emprestado MUST limpar só o ano lido, mantendo o empréstimo.

#### Scenario: Reverter livro lido erroneamente na lista do ano
- **WHEN** o usuário seleciona a opção rápida de desfazer conclusão em um livro da seção "Lidos no ano"
- **THEN** o livro deixa de constar como lido no ano, o contador da meta anual é recalculado instantaneamente e um toast confirma a alteração

#### Scenario: Desfazer leitura de livro emprestado
- **WHEN** o usuário desfaz a leitura de um livro de "Lidos no ano" que está emprestado a Joana
- **THEN** o livro sai de "Lidos no ano" e continua emprestado a Joana
