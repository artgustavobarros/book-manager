## ADDED Requirements

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
O sistema SHALL persistir uma meta por usuário e por ano (padrão 24 quando não definida). O Painel MUST mostrar a meta do ano corrente: lidos no ano, barra de progresso, marcador "esperado até hoje" (fração do ano decorrida), a linha "Faltam N livros · cerca de X por mês até dezembro" e os botões −/+, que ajustam a meta em 1 (mínimo 1) e persistem pela API.

#### Scenario: Ajustar meta
- **WHEN** o usuário clica em "+" com a meta 24
- **THEN** a meta do ano corrente vira 25 imediatamente e é persistida em `PUT /api/goals/<ano>`

#### Scenario: Virada de ano
- **WHEN** chega um novo ano e o usuário não definiu meta para ele
- **THEN** o Painel usa 24 para o novo ano e a meta do ano anterior continua guardada

#### Scenario: Selo de ritmo
- **WHEN** há pelo menos um livro no acervo
- **THEN** o selo mostra "Meta cumprida", "No ritmo" ou "N abaixo do ritmo", com as cores semânticas de sucesso/alerta; com o acervo vazio, o selo não aparece

### Requirement: Lidos no ano
O Painel SHALL listar as mini-capas dos livros com status `lido` e ano lido igual ao ano corrente, cada uma abrindo a ficha.

#### Scenario: Nenhum lido no ano
- **WHEN** não há livros lidos no ano corrente
- **THEN** aparece "Nenhum livro marcado como lido este ano ainda."

### Requirement: Lendo agora
O Painel SHALL listar os livros com status `lendo`, com o botão "Terminei", que marca o livro como `lido` (preenchendo o ano lido, se vazio) e mostra o toast "✓ <título> marcado como lido".

#### Scenario: Nenhum em leitura
- **WHEN** não há livros com status `lendo`
- **THEN** aparece a mensagem orientando a mudar um status para "Lendo" ou usar "Me surpreenda"

### Requirement: Últimos adicionados
O Painel SHALL listar os 5 livros com data de aquisição mais recente, com a data formatada, e o link "Ver estante →".

#### Scenario: Abrir um recente
- **WHEN** o usuário clica num item de "Últimos adicionados"
- **THEN** a ficha do livro abre
