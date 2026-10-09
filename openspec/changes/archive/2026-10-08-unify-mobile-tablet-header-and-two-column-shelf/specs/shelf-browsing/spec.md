## ADDED Requirements

### Requirement: Capas em duas colunas no celular
O sistema SHALL organizar os livros do modo Capas da estante em exatamente duas colunas de mesma largura em janelas de até 640 px, inclusive a 320 px. Cards, textos e controles MUST caber na largura disponível sem provocar rolagem horizontal ou impedir o uso de ações. Acima de 640 px, o grid SHALL manter o preenchimento responsivo existente.

#### Scenario: Estante com livros no celular estreito
- **WHEN** a pessoa abre o modo Capas da estante com ao menos dois livros em uma janela de 320 px
- **THEN** dois cards aparecem lado a lado, sem corte de controles nem rolagem horizontal

#### Scenario: Estante com livros no celular comum
- **WHEN** a pessoa abre o modo Capas da estante com ao menos dois livros em uma janela de 390 px
- **THEN** dois cards aparecem lado a lado e suas ações continuam utilizáveis

#### Scenario: Alternância de modo de visualização
- **WHEN** a pessoa escolhe Lista em uma janela de até 640 px
- **THEN** os livros são mostrados no modo Lista existente e a escolha de duas colunas não altera filtros, ordenação ou paginação
