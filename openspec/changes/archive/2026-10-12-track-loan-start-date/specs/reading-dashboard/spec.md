## MODIFIED Requirements

### Requirement: Detalhamento de empréstimos no Painel
O KPI de "Emprestados" no Painel SHALL permitir visualização detalhada da lista de livros atualmente emprestados, exibindo título, nome de quem pegou emprestado e cálculo de dias decorridos desde o empréstimo (ex: "há 35 dias"). A contagem MUST partir do início do empréstimo (`lentAt`), não da última atualização do livro, e MUST contar dias de calendário no fuso do usuário: o rótulo é "hoje" no mesmo dia do empréstimo e "há 1 dia" a partir da meia-noite seguinte nesse fuso. Livro emprestado sem início registrado MUST aparecer sem a contagem.

#### Scenario: Visualizar livros fora de casa
- **WHEN** o usuário tem 2 livros emprestados e acessa o detalhamento de empréstimos no Painel
- **THEN** uma lista exibe os títulos, os nomes das pessoas e a contagem de dias emprestados

#### Scenario: Virada do dia no fuso do usuário
- **WHEN** um livro foi emprestado às 22h de ontem (horário de Brasília) e o usuário, nesse fuso, abre o Painel às 9h de hoje
- **THEN** a contagem mostra "há 1 dia", e não "hoje"

#### Scenario: Edição recente não zera a contagem
- **WHEN** um livro emprestado há 35 dias teve as anotações editadas hoje
- **THEN** a contagem continua "há 1 mês", e não "hoje"
