## 1. Preparar Google e dados

- [ ] 1.1 Configurar as APIs Google Sheets e Google Drive e a tela de consentimento OAuth do projeto Google Cloud para `drive.file`; documentar publicação/verificação e URI de callback.
- [x] 1.2 Adicionar migration Drizzle para conexão da planilha por usuário e execuções com chave única `(userId, weekKey)`, status, tentativa, lease, erro e datas; limpar esses registros por cascata na exclusão da conta.
- [x] 1.3 Adicionar e validar `CRON_SECRET` nas configurações do servidor, sem expô-lo ao cliente.

## 2. Conectar a conta Google

- [x] 2.1 Criar fluxo opcional `linkSocial` com `drive.file` e acesso offline, preservando o login Google e a importação atuais.
- [x] 2.2 Implementar intenção de conexão, retorno do OAuth e ativação que verifica conta, escopo e refresh token no servidor, inclusive para usuário com login por e-mail.
- [x] 2.3 Implementar obtenção/renovação segura do token da conta Google vinculada e classificar revogação ou ausência de token como necessidade de reconexão.

## 3. Escrever a planilha

- [x] 3.1 Criar planilha privada gerenciada pelo app, persistir seu ID e recuperar com segurança falhas entre criação remota e gravação local.
- [x] 3.2 Mapear todos os campos de `Book` para cabeçalho e valores literais, com ordem estável, acervo vazio e sem `userId` ou dados de autenticação.
- [x] 3.3 Implementar escrita de aba `AAAA-Www` e reconciliação de aba já existente; para payloads grandes, usar aba temporária e publicar apenas após escrita completa.
- [x] 3.4 Registrar sucesso somente após resposta confirmada da API Google e registrar erro resumido sem token ou conteúdo dos livros.

## 4. Agendar com isolamento e repetição

- [x] 4.1 Implementar cálculo da semana ISO UTC e seleção paginada de conexões habilitadas sem sucesso na semana atual, incluindo ativações pendentes.
- [x] 4.2 Implementar reserva/lease por usuário e semana, expiração da reserva, deduplicação e nova tentativa de falhas transitórias.
- [x] 4.3 Criar rota GET interna que valida `Authorization: Bearer <CRON_SECRET>`, limita trabalho por invocação e processa somente usuários encontrados no banco.
- [x] 4.4 Configurar cron diário em UTC em `vercel.json` e documentar monitoramento, limites e comportamento de retry.

## 5. Controles do usuário

- [x] 5.1 Criar endpoints sob sessão para ler estado, iniciar conexão, ativar após OAuth, repetir falha e desativar exportação.
- [x] 5.2 Adicionar seção na interface da conta com consentimento, estado, última cópia/falha, link para a planilha, reconexão e desativação.
- [x] 5.3 Confirmar que desativação e exclusão da conta preservam a planilha remota e impedem novas gravações.

## 6. Verificar e lançar

- [x] 6.1 Testar semana ISO, serialização literal de fórmulas, campos completos, acervo vazio e isolamento entre usuários.
- [x] 6.2 Testar com API Google simulada: primeira cópia, semana seguinte, chamada duplicada, falha transitória, falha após escrita remota e revogação do token.
- [x] 6.3 Testar endpoints de sessão e cron sem/com segredo, conexão, retry e desativação; executar build e testes relevantes.
- [ ] 6.4 Validar em ambiente de teste com uma conta Google real, depois publicar a configuração OAuth e o cron em produção.
