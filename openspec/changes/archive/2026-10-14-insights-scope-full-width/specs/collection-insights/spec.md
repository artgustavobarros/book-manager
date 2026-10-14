## MODIFIED Requirements

### Requirement: Escopo dos gráficos
A página Dados do acervo SHALL oferecer o escopo "Todo o acervo" ou "Apenas lidos", que afeta os gráficos por status, gênero, nacionalidade e editora. O controle segmentado de escopo MUST ficar logo acima da grade de gráficos e abaixo dos KPIs, ocupando a largura toda do conteúdo, com as duas opções dividindo o espaço igualmente, sem título ao lado, e MUST NOT ficar no cabeçalho da página. Os KPIs MUST NOT mudar com o escopo. A página MUST NOT mostrar legenda de escopo ("Gráficos calculados…"); o controle segmentado é a única indicação do escopo ativo. Em toda a página (escopo, KPIs, páginas lidas, lidos por ano e atribuição de ano), um livro MUST contar como lido quando tem status `lido` ou quando tem status `emprestado` e ano lido preenchido.

#### Scenario: Apenas lidos
- **WHEN** o usuário escolhe "Apenas lidos"
- **THEN** "Apenas lidos" fica ativo no controle segmentado, os gráficos usam só os lidos, os KPIs mantêm os mesmos valores e nenhuma frase "Gráficos calculados…" aparece

#### Scenario: Todo o acervo sem legenda
- **WHEN** o usuário abre Dados do acervo com o escopo padrão
- **THEN** o cabeçalho mostra só o título "Dados do acervo", e o controle segmentado aparece na largura toda, sem título, entre os KPIs e a grade de gráficos

#### Scenario: Livro lido emprestado
- **WHEN** um livro `lido` em 2026, com 200 páginas, é emprestado
- **THEN** ele continua contando na coluna de 2026 de "Lidos por ano" e nas páginas lidas
