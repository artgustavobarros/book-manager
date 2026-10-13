# reading-dashboard Specification

## Purpose
TBD - created by archiving change bodega-literaria-app. Update Purpose after archive.
## Requirements
### Requirement: Cabeçalho do Painel
O Painel SHALL mostrar a data de hoje por extenso em pt-BR (dia da semana capitalizado) e a saudação conforme o horário local ("Bom dia" antes de 12h, "Boa tarde" antes de 18h, "Boa noite" depois), seguida do primeiro nome do usuário.

#### Scenario: Saudação vespertina
- **WHEN** o usuário "Ana Lima" abre o Painel às 15h
- **THEN** o título mostra "Boa tarde, Ana"

### Requirement: KPIs do Painel
O Painel SHALL mostrar 5 KPIs: Livros no acervo (+ adquiridos no ano), Lidos (% do acervo), Páginas lidas (média de páginas por livro), Emprestados ("fora de casa agora" / "todos em casa") e Autores (nº de nacionalidades), com os mesmos cálculos de `painel()` no standalone.

#### Scenario: Acervo com livros
- **WHEN** o usuário tem 10 livros, 4 deles lidos
- **THEN** o KPI "Lidos" mostra "4" com o subtítulo "40% do acervo"

### Requirement: Meta de leitura por ano
O sistema SHALL persistir uma meta por usuário e por ano (padrão 24 quando não definida). A meta de um usuário MUST ser isolada: ler ou gravar a meta de um ano nunca expõe nem altera a meta de outro usuário. A meta MUST ser um inteiro de 1 a 1000, e `PUT /api/goals/<ano>` responde 400 fora disso. O ano da rota MUST ser um inteiro de 1000 a 9999, e as rotas respondem 404 fora disso. O Painel MUST mostrar a meta do ano corrente: lidos no ano, barra de progresso, marcador "esperado até hoje" (fração do ano decorrida), a linha "Faltam N livros · cerca de X por mês até dezembro" e os botões −/+, que ajustam a meta em 1 (mínimo 1) e persistem pela API.

#### Scenario: Ajustar meta
- **WHEN** o usuário clica em "+" com a meta 24
- **THEN** a meta do ano corrente vira 25 imediatamente e é persistida em `PUT /api/goals/<ano>`

#### Scenario: Virada de ano
- **WHEN** chega um novo ano e o usuário não definiu meta para ele
- **THEN** o Painel usa 24 para o novo ano e a meta do ano anterior continua guardada

#### Scenario: Meta isolada por usuário
- **WHEN** a usuária A grava a meta 50 para 2026 e o usuário B, que não definiu meta, consulta 2026
- **THEN** B recebe o padrão 24
- **WHEN** B grava a meta 7 para 2026
- **THEN** A continua lendo 50 para 2026

#### Scenario: Limites da meta
- **WHEN** o usuário grava a meta 1 ou 1000
- **THEN** a API responde 200 e persiste o valor
- **WHEN** o usuário grava 0, 1001 ou 1.5
- **THEN** a API responde 400 e a meta anterior continua guardada

#### Scenario: Limites do ano
- **WHEN** o usuário consulta ou grava a meta dos anos 1000 ou 9999
- **THEN** a API responde 200
- **WHEN** o ano da rota é 999, 10000 ou não numérico
- **THEN** a API responde 404

#### Scenario: Selo de ritmo
- **WHEN** há pelo menos um livro no acervo
- **THEN** o selo mostra "Meta cumprida", "No ritmo" ou "N abaixo do ritmo", com as cores semânticas de sucesso/alerta; com o acervo vazio, o selo não aparece

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

### Requirement: Lendo agora
O Painel SHALL listar os livros com status `lendo`, com o botão "Terminei", que marca o livro como `lido` (preenchendo o ano lido, se vazio) e mostra o toast de sucesso "<título> marcado como lido", sem emoji.

#### Scenario: Nenhum em leitura
- **WHEN** não há livros com status `lendo`
- **THEN** aparece a mensagem orientando a mudar um status para "Lendo" ou usar "Me surpreenda"

#### Scenario: Terminei
- **WHEN** o usuário clica em "Terminei" em "Americanah"
- **THEN** o livro sai de "Lendo agora" e aparece o toast "Americanah marcado como lido"

### Requirement: Últimos adicionados
O Painel SHALL listar os 5 livros com data de aquisição mais recente, com a data formatada, e o link "Ver estante →".

#### Scenario: Abrir um recente
- **WHEN** o usuário clica num item de "Últimos adicionados"
- **THEN** a ficha do livro abre

### Requirement: Gestão ágil de leitura ativa no Painel
O Painel SHALL permitir, além do botão "Terminei" para livros em leitura, reverter o status de livros listados em "Lidos no ano" ou iniciar leitura diretamente de "Últimos adicionados", com atualizações otimistas na barra da meta anual e no indicador de ritmo. Desfazer a leitura de um livro emprestado MUST limpar só o ano lido, mantendo o empréstimo.

#### Scenario: Reverter livro lido erroneamente na lista do ano
- **WHEN** o usuário seleciona a opção rápida de desfazer conclusão em um livro da seção "Lidos no ano"
- **THEN** o livro deixa de constar como lido no ano, o contador da meta anual é recalculado instantaneamente e um toast confirma a alteração

#### Scenario: Desfazer leitura de livro emprestado
- **WHEN** o usuário desfaz a leitura de um livro de "Lidos no ano" que está emprestado a Joana
- **THEN** o livro sai de "Lidos no ano" e continua emprestado a Joana

### Requirement: Detalhamento de empréstimos no Painel
O KPI de "Emprestados" no Painel SHALL permitir visualização detalhada da lista de livros atualmente emprestados, exibindo título, nome de quem pegou emprestado e cálculo de dias decorridos desde o empréstimo (ex: "há 35 dias"). A contagem MUST partir do início do empréstimo (`lentAt`), não da última atualização do livro, e MUST contar dias de calendário no fuso do usuário: o rótulo é "hoje" no mesmo dia do empréstimo e "há 1 dia" a partir da meia-noite seguinte nesse fuso. Livro emprestado sem início registrado MUST aparecer sem a contagem. O KPI MUST ser um botão nativo (`<button>`), acessível pelo teclado: ele entra na ordem de Tab, mostra o anel de foco e abre o detalhamento com clique, Enter ou Espaço.

#### Scenario: Visualizar livros fora de casa
- **WHEN** o usuário tem 2 livros emprestados e acessa o detalhamento de empréstimos no Painel
- **THEN** uma lista exibe os títulos, os nomes das pessoas e a contagem de dias emprestados

#### Scenario: Abrir o detalhamento pelo teclado
- **WHEN** o usuário foca o KPI "Emprestados" com Tab e pressiona Enter, ou Espaço
- **THEN** o modal "Livros emprestados" abre, igual ao clique

#### Scenario: Virada do dia no fuso do usuário
- **WHEN** um livro foi emprestado às 22h de ontem (horário de Brasília) e o usuário, nesse fuso, abre o Painel às 9h de hoje
- **THEN** a contagem mostra "há 1 dia", e não "hoje"

#### Scenario: Edição recente não zera a contagem
- **WHEN** um livro emprestado há 35 dias teve as anotações editadas hoje
- **THEN** a contagem continua "há 1 mês", e não "hoje"

