## MODIFIED Requirements

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
