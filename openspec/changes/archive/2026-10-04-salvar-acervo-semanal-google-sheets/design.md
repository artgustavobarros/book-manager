## Context

O banco Postgres é a fonte dos livros por `userId`. Hoje `POST /api/sheet-sync` lê CSV de uma planilha pública e aplica merge no banco; os downloads CSV/JSON são gerados no navegador. O login Google via Better Auth já existe, mas concede apenas acesso de identidade e não oferece permissão de escrita nem garante refresh token para uma rotina sem sessão. A implantação descrita no projeto usa Vercel.

## Goals / Non-Goals

**Goals:**

- Exportar somente o acervo de livros do usuário, inclusive favorito e metadados dos livros ausentes do CSV manual, para uma planilha privada que lhe pertence.
- Criar uma cópia por semana em aba identificada pela semana ISO (UTC), preservando semanas anteriores; permitir uma primeira cópia logo após conectar.
- Executar sem navegador aberto, recuperar falhas transitórias, impedir duplicatas na mesma semana e informar ao usuário se a autorização precisar ser refeita.

**Non-Goals:**

- Exportar metas, configurações, dados de login ou tokens para a planilha.
- Sincronização bidirecional, escrita numa planilha arbitrária fornecida por URL ou alteração do fluxo atual de importação.
- Restaurar automaticamente uma semana antiga, apagar a planilha remota ao desativar ou prometer retenção ilimitada.

## Decisions

### Autorização Google separada do login

Usar o cliente OAuth Google já configurado, mas pedir `https://www.googleapis.com/auth/drive.file` apenas quando o usuário escolher **Conectar Google Sheets**. Esse escopo permite criar e editar os arquivos usados pelo app e é aceito pelos métodos `spreadsheets.create`, `spreadsheets.batchUpdate` e `drive.files.list`; evita o escopo amplo `spreadsheets`. O fluxo `authClient.linkSocial` do Better Auth deve pedir `access_type=offline` e consentimento explícito, inclusive para quem já entra com Google. Guardar/renovar tokens somente no servidor via registro `account` do Better Auth; verificar vínculo, escopo e refresh token antes de ativar. Se faltar token persistente, pedir nova autorização. O usuário pode entrar com e-mail/senha e vincular uma conta Google sem trocar o método de login.

Alternativa descartada: conta de serviço ou planilha pública compartilhada. A primeira exigiria compartilhar a planilha com o serviço ou transferir propriedade; a segunda não fornece escrita privada em nome do usuário.

### Planilha gerenciada pelo app e formato do snapshot

Criar uma planilha nova, privada, por usuário na conta autorizada, com nome como `Bodega Literária — Acervo`. Guardar `spreadsheetId`, conta Google vinculada, estado habilitado e último resultado em configuração própria. Não usar `user_settings.sheet_url`, que hoje identifica a origem de importação. Cada aba terá título estável `AAAA-Www` (semana ISO em UTC), cabeçalho e uma linha por livro, ordenada como `listBooks`. O mapeamento inclui todos os campos do tipo `Book`, mas omite `userId` e dados de autenticação; usa valores literais (`stringValue`/`numberValue`/`boolValue`), de modo que anotações começando com `=` não virem fórmulas. Uma semana já concluída não é regravada em execução normal. Uma aba vazia contém somente o cabeçalho.

Alternativa descartada: sobrescrever sempre uma única aba. Isso perderia a cópia da semana anterior, contrariando o uso como backup periódico. Também não se escreverá na URL de importação existente: ela pode ser pública, de terceiro ou conter fórmulas e outros dados.

### Agendamento, estado e idempotência

Adicionar cron Vercel diário em UTC (por exemplo, `0 6 * * *`), que procura usuários habilitados sem sucesso na semana ISO atual. Isso produz no máximo uma aba por semana e permite nova tentativa diária quando há erro; o agendamento diário é uma verificação, não uma nova cópia diária. Proteger a rota com `CRON_SECRET`, método GET e comparação do header `Authorization`. Criar registro de execução com chave única `(userId, weekKey)`, status, tentativas, erro resumido, `startedAt` e `completedAt`; usar reserva/lease com expiração para evitar duas chamadas simultâneas. Paginar os usuários elegíveis e limitar o trabalho por invocação; se o volume superar a duração da função, mover a iteração para fila ou fan-out antes do lançamento em escala.

Antes do redirecionamento OAuth, registrar a intenção de ativar. Após o retorno, a interface chama uma rota de ativação sob sessão que confere escopo/token e dispara a primeira cópia; se o navegador fechar nesse ponto, a varredura diária conclui a ativação pendente. A criação do arquivo é persistida antes de publicar a primeira aba. Para semanas seguintes, consultar as abas existentes e gravar a aba inteira em uma única chamada `spreadsheets.batchUpdate` com `addSheet` e `updateCells`, ou atualizar a aba da semana se houve sucesso remoto seguido de falha no registro local. Para catálogos acima do tamanho seguro de uma requisição, escrever numa aba temporária em lotes e só publicar o nome semanal após concluir todos os lotes. Só marcar sucesso após confirmação da API. Nunca marcar como concluído por haver apenas um registro local iniciado.

Alternativa descartada: cron diretamente semanal. Um disparo perdido ou erro temporário ficaria sem nova tentativa até a semana seguinte; a Vercel não repete automaticamente uma invocação falha.

### Estado visível e ciclo de vida

Adicionar controle na área de conta com **Conectar**, **Abrir planilha**, **Tentar novamente** (quando houve falha) e **Desativar**. Mostrar último sucesso, última falha e orientação para reconectar quando houver revogação/expiração. A desativação impede novas execuções; mantém o arquivo do Google e os dados já exportados. Ao excluir a conta no app, os registros locais de conexão e execução são apagados em cascata; o arquivo permanece sob controle do usuário no Google Drive.

## Risks / Trade-offs

- [OAuth em modo Testing] → O refresh token de projeto externo em teste pode expirar em sete dias; publicar/configurar corretamente a tela de consentimento antes de oferecer a função em produção e testar a renovação.
- [Permissão revogada ou conta Google alterada] → Registrar falha e pedir reconexão; nunca tentar gravar com outra conta ou outra planilha silenciosamente.
- [Falha entre criação da planilha e gravação do ID no banco] → Pode ficar um arquivo órfão no Drive; registrar a falha e reconciliar antes de criar outro, ou exibir instrução para remover o arquivo órfão.
- [Entrega duplicada do cron ou falha após escrita remota] → Chave semanal única, lease e reconciliação da aba existente antes de nova tentativa.
- [Limites de células, quota e tempo de função] → Exportar em lotes controlados quando necessário, tratar `429`/`5xx` com retry limitado e mostrar falhas; rever retenção quando o volume aproximar o limite da planilha.
- [Dados privados na planilha] → Arquivo privado por padrão, escopo restrito, tokens apenas no servidor, sem dados pessoais em logs, e texto gravado como valor literal para evitar fórmulas.

## Migration Plan

1. Habilitar as APIs Google Sheets e Google Drive no projeto Google Cloud; configurar a tela de consentimento para `drive.file`, o OAuth client existente e o estado de publicação adequado. Adicionar `CRON_SECRET` no ambiente de produção.
2. Aplicar a migração de conexão/exportações; implantar rotas e UI desativadas por padrão. O cron ignora contas não habilitadas.
3. Habilitar o cron em `vercel.json`; validar com conta de teste: consentimento, primeira cópia, execução na semana seguinte, retry, desativação e revogação.
4. Em rollback, remover/desabilitar o cron e a entrada da UI; manter a tabela e as planilhas já criadas até haver política explícita de limpeza.

## Open Questions

- Nenhuma decisão bloqueante. Se for exigida retenção por prazo fixo ou restauração automática a partir de uma semana antiga, propor um complemento específico.

## Referências técnicas

- [Escopos da API Google Sheets](https://developers.google.com/workspace/sheets/api/scopes)
- [Criação de planilha](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/create) e [atualização em lote](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets/batchUpdate)
- [OAuth offline do Google](https://developers.google.com/identity/protocols/oauth2/web-server) e [escopos adicionais no Better Auth](https://better-auth.com/docs/concepts/oauth)
- [Cron Jobs da Vercel](https://vercel.com/docs/cron-jobs) e [execução, segurança e falhas](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
