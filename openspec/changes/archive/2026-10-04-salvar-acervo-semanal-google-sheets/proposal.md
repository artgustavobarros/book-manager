## Why

Hoje o acervo só chega ao Google Sheets quando o usuário exporta um arquivo manualmente; a integração existente apenas lê uma planilha compartilhada. Quem quer manter uma cópia atualizada dos livros na própria conta Google precisa repetir essa operação toda semana.

## What Changes

- Oferecer uma conexão opcional com a conta Google, com consentimento específico para criar e atualizar uma planilha do app.
- Criar uma planilha privada na conta do usuário e salvar nela, automaticamente, uma aba datada com uma cópia completa do acervo a cada semana.
- Mostrar no app o link da planilha, o estado da conexão, a data da última gravação e falhas que exijam reconexão; permitir desligar a exportação.
- Manter a importação atual de planilhas e os downloads manuais de CSV/JSON como ações independentes.

## Capabilities

### New Capabilities

- `weekly-sheets-export`: autorização, planilha gerenciada pelo app, exportação periódica do acervo e controle de estado pelo usuário.

### Modified Capabilities

Nenhuma. A leitura da planilha informada pelo usuário e os downloads existentes continuam com o mesmo contrato.

## Impact

- Better Auth/Google OAuth, Google Sheets API e configuração do projeto Google Cloud.
- Dados de configuração por usuário e migração Drizzle para vínculo da planilha e histórico de execução.
- Serviço de exportação, rota interna de agendamento protegida e agendamento Vercel.
- Interface de configurações da conta, mensagens de erro e testes de integração.
