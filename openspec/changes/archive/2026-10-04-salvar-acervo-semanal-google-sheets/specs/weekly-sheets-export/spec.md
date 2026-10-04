## ADDED Requirements

### Requirement: Conexão opcional com a conta Google
O sistema SHALL iniciar a exportação apenas após consentimento explícito do usuário autenticado para criar e editar arquivos do app no Google Drive. A autorização SHALL permitir acesso sem sessão ativa e SHALL funcionar tanto para contas do app criadas por e-mail quanto para contas que usam login Google. A conexão de exportação MUST ser independente da URL salva para importação de planilha.

#### Scenario: Usuário conecta uma conta Google
- **WHEN** o usuário ativa a exportação e concede a permissão solicitada no Google
- **THEN** o app associa a conta Google autorizada ao usuário atual e prepara a primeira cópia do acervo

#### Scenario: Consentimento negado
- **WHEN** o usuário cancela ou nega a permissão no Google
- **THEN** a exportação permanece desativada e nenhuma planilha é criada

#### Scenario: Login Google já existente
- **WHEN** um usuário que já entra com Google ativa a exportação
- **THEN** o app solicita a permissão adicional para a planilha, sem assumir que o login anterior já a concedeu

### Requirement: Planilha privada com cópias semanais
O sistema SHALL criar uma planilha privada sob a conta Google autorizada e guardar seu identificador por usuário. Cada semana ISO em UTC SHALL corresponder a uma aba identificada por `AAAA-Www`, contendo cabeçalho e todos os livros desse usuário no momento da cópia, inclusive favoritos e metadados de livro. O sistema MUST excluir dados de autenticação, tokens e livros de outros usuários. Conteúdo textual MUST ser escrito como texto literal, sem executar fórmulas.

#### Scenario: Primeira cópia
- **WHEN** o usuário termina a conexão e possui livros
- **THEN** uma aba da semana atual contém uma linha por livro e a interface oferece o link da planilha privada

#### Scenario: Acervo vazio
- **WHEN** chega o momento da cópia e o usuário não possui livros
- **THEN** a aba da semana é criada apenas com o cabeçalho e a execução é registrada como concluída

#### Scenario: Texto semelhante a fórmula
- **WHEN** uma anotação começa com `=` ou outro marcador de fórmula
- **THEN** o valor aparece como texto na célula e não é executado como fórmula

#### Scenario: Nova semana
- **WHEN** a exportação da semana seguinte conclui
- **THEN** aparece uma nova aba semanal e a aba da semana anterior permanece disponível

### Requirement: Execução automática e sem duplicatas
O sistema SHALL verificar diariamente as contas habilitadas e exportar cada acervo no máximo uma vez por semana ISO, sem exigir que o usuário esteja conectado ao app. O processamento MUST impedir gravações simultâneas da mesma semana para o mesmo usuário e MUST repetir falhas transitórias em uma execução posterior da semana. Uma execução só SHALL ser considerada concluída após confirmação da escrita no Google Sheets.

#### Scenario: Semana já concluída
- **WHEN** o agendamento roda novamente para um usuário com cópia concluída na semana atual
- **THEN** nenhuma nova aba ou gravação automática é feita para esse usuário

#### Scenario: Disparos simultâneos
- **WHEN** duas invocações tentam processar o mesmo usuário na mesma semana
- **THEN** somente uma obtém a reserva de execução e não surgem abas duplicadas

#### Scenario: Erro temporário
- **WHEN** a API Google falha antes de confirmar a cópia
- **THEN** a semana não é marcada como concluída, o erro é registrado e uma execução posterior tenta novamente

#### Scenario: Escrita remota confirmada e gravação local falha
- **WHEN** a aba foi criada no Google mas o registro local de sucesso falha
- **THEN** a tentativa seguinte reconcilia a aba da mesma semana sem criar outra

### Requirement: Controle e transparência da exportação
O sistema SHALL mostrar ao usuário autenticado se a exportação está ativa, a data da última cópia concluída, falha recente e um link para a planilha. O usuário SHALL poder tentar novamente após falha e desativar a exportação. A desativação MUST impedir novas execuções e MUST preservar as cópias já salvas na conta Google.

#### Scenario: Autorização revogada ou expirada
- **WHEN** o Google deixa de aceitar a autorização persistente
- **THEN** a exportação registra a falha e a interface orienta a reconectar a conta, sem usar outra conta automaticamente

#### Scenario: Desativar
- **WHEN** o usuário desativa a exportação
- **THEN** o agendamento deixa de processar seu acervo e a planilha existente permanece na conta Google

#### Scenario: Excluir conta do app
- **WHEN** o usuário exclui a conta no app
- **THEN** os vínculos e registros locais de exportação são removidos, sem apagar a planilha que pertence ao usuário no Google Drive

### Requirement: Acesso restrito à execução agendada
A rota de agendamento SHALL aceitar somente chamadas autenticadas pelo segredo de cron configurado no servidor e MUST obter os usuários elegíveis do banco, nunca de identificadores enviados pelo cliente.

#### Scenario: Chamada não autorizada
- **WHEN** a rota é chamada sem o segredo correto
- **THEN** retorna acesso negado e não lê nem exporta acervos
