## ADDED Requirements

### Requirement: URL da planilha por usuário
O sistema SHALL salvar, por usuário, a URL da planilha do Google Sheets informada no modal "Sincronizar planilha" e preenchê-la automaticamente nas próximas aberturas, permitindo ressincronizar quantas vezes o usuário quiser.

#### Scenario: Reabrir o modal
- **WHEN** o usuário já sincronizou uma vez e reabre o modal
- **THEN** o campo vem preenchido com a URL salva

### Requirement: Sincronização no servidor
A sincronização SHALL ser executada por `POST /api/sheet-sync`: o servidor converte a URL de compartilhamento ou publicação no endpoint CSV (incluindo `gid`), baixa o CSV, interpreta e aplica o merge numa operação atômica. Respostas HTML (planilha não pública), planilhas sem cabeçalho de título ou com menos de 2 linhas MUST falhar com a mensagem de orientação do standalone.

#### Scenario: Link inválido
- **WHEN** a URL não é de uma planilha do Google
- **THEN** aparece "Link inválido. Use o link de compartilhamento da planilha." e nada é baixado

#### Scenario: Planilha privada
- **WHEN** a planilha não está compartilhada como "Qualquer pessoa com o link"
- **THEN** a sincronização falha sem alterar dados e mostra a orientação de compartilhamento

### Requirement: Interpretação do CSV
O parser SHALL aceitar separadores `;` ou `,` (detectados pela primeira linha), aspas com escape `""`, BOM e quebras CRLF. O mapeamento de cabeçalhos MUST reconhecer os nomes do standalone (ordem, título, status, autor, editora, país/nacionalidade, gênero, emprestado, páginas, ano lido, lançamento/ano, aquisição, capa, anotações) e também Cor/etnia ("cor", "etnia", "raça"). Uma coluna "gênero" cujos valores sejam ≥70% do tipo homem/mulher/nd MUST ser tratada como gênero do autor.

#### Scenario: Coluna de gênero do autor
- **WHEN** a planilha tem uma coluna "GÊNERO" com valores "Mulher", "Homem", "ND"
- **THEN** a coluna é mapeada para gênero do autor(a), e não para gênero da obra

#### Scenario: Datas em formato brasileiro
- **WHEN** a aquisição vem como "05/03/2024"
- **THEN** é gravada como 2024-03-05

### Requirement: Merge que preserva dados locais
O merge SHALL casar cada linha com um livro existente pelo nº de ordem (se o título normalizado também bater) ou por título + autor normalizados. Para livros casados, os campos não vazios da planilha MUST sobrescrever os do app, exceto anotações, capa, páginas e ano lido, que MUST ser preservados quando já preenchidos no app. Linhas sem correspondência MUST criar livros novos (status padrão `nao-lido`, nº da planilha se livre, senão o próximo).

#### Scenario: Atualizar livro existente
- **WHEN** a planilha traz um livro já existente com outra editora, e o app tem anotações nele
- **THEN** a editora é atualizada e as anotações são mantidas

#### Scenario: Resultado
- **WHEN** a sincronização termina
- **THEN** aparece "Sincronizado: N livros atualizados e M novos.", o toast "Planilha sincronizada" e a Estante reflete os dados novos
