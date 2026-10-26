# Bodega Literária

Catálogo pessoal dos livros de casa: **Painel** (indicadores, meta anual, leituras em andamento), **Estante** (capas ou lista, busca, filtros, facetas, ordenação) e **Dados** (gráficos), com contas de usuário, sincronização com Google Sheets, busca de livros e capas online, exportação em CSV, backup em JSON e uma **estante pública** opcional para compartilhar o acervo nas redes sociais.

Quem cria uma conta com e-mail e senha pode usar o acervo imediatamente. Um aviso lembra da confirmação do endereço até que o link enviado por e-mail seja aberto; os dados criados nesse período ficam salvos.

O app reproduz o design do handoff em [`design/handoff/`](design/handoff/README.md).

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router, Route Handlers, `proxy.ts`), React 19, TypeScript strict |
| UI | Tailwind CSS v4 com os tokens do design, shadcn/ui (Radix) restilizado, React Hook Form + Zod |
| Dados | Postgres (Neon via Vercel Storage) com Drizzle ORM; PGlite no desenvolvimento e nos testes |
| Auth | Better Auth: e-mail e senha com verificação, recuperação de senha, Google, rate limit |
| E-mail | Nodemailer via Gmail SMTP (interface trocável, por exemplo por Resend) |
| Estado | TanStack Query (cache do acervo, atualizações otimistas) |
| Env | T3 Env (validação das variáveis no build e no runtime) |
| Testes | Vitest (domínio, API, auth), Playwright (e2e, axe, comparação visual) |

## Estrutura

```
app/                  rotas: (auth) entrar/cadastro/senha · verifique-email · (app) Painel/Estante/Dados · (public) estante/[slug] · og/ · api/
components/           app (shell, modais), books, estante, dados, painel, auth, share, public, custom, ui (primitivos)
lib/domain/           lógica pura portada do standalone (filtros, Painel, Dados, CSV, planilha, backup…)
lib/services/         acesso ao banco por usuário (livros, metas, configurações, planilha)
lib/validation/       schemas Zod compartilhados entre formulários e API
lib/db/               schema Drizzle (domínio + Better Auth), cliente e migrations (drizzle/)
tests/                unit · integration · e2e · visual (+ fixtures do acervo de referência)
design/handoff/       design original (referência imutável)
```

## Rodando localmente

Requisitos: Node 22+ e pnpm (via corepack).

```bash
pnpm install
cp .env.example .env.local   # preencha BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate              # cria/atualiza o banco local
pnpm db:seed                 # opcional: usuário ana@exemplo.com / senha-forte-123 com 30 livros
pnpm dev                     # http://localhost:3000
```

### Banco de dados local

Não é preciso instalar Postgres nem Docker: com `DATABASE_URL=pglite://./.data/dev` o app usa o [PGlite](https://pglite.dev) (Postgres em WASM), persistido em `.data/` (ignorada pelo git). Para recomeçar, apague `.data/dev` e rode `pnpm db:migrate` de novo. O PGlite aceita um processo por vez: pare o `pnpm dev` antes de rodar `db:seed`.

Para usar um Postgres de verdade (por exemplo uma branch de desenvolvimento do Neon), troque `DATABASE_URL` por uma URL `postgres://…`.

| Script | O que faz |
|---|---|
| `pnpm db:generate` | Gera uma migration a partir de `lib/db/schema.ts` |
| `pnpm db:migrate` | Aplica as migrations de `drizzle/` (usa `DATABASE_URL_UNPOOLED` se existir) |
| `pnpm db:seed` | Cria o usuário de referência com o acervo do design (30 livros) |
| `pnpm db:seed:personas` | Popula o banco com 4 personas de teste (Arthur Whale 600 livros, Mariana Empréstimos, Lucas Metas e Zero Novato) |
| `pnpm db:studio` | Drizzle Studio (somente Postgres) |

O schema das tabelas de autenticação (`lib/db/auth-schema.ts`) é gerado pelo Better Auth: `npx auth@latest generate --config lib/auth.ts --output lib/db/auth-schema.ts`.

### Personas de Teste (Carga, Empréstimos e Casos Limite)

Para testar o sistema com cenários realistas e estressar o desempenho da Estante e dos cálculos:

```bash
pnpm db:seed:personas
```

Todas as contas são criadas com a senha `senha-forte-123`:

- **Arthur Whale** (`arthur.whale@exemplo.com`): 600 livros, múltiplos autores, gêneros, anos de leitura e 50 livros de meta. Ideal para testes de estresse de renderização, paginação e busca textual massiva.
- **Mariana Empréstimos** (`mariana.emprestimos@exemplo.com`): 45 livros, sendo 15 emprestados para amigos variados. Ideal para testar devoluções rápidas, modal de empréstimos e alertas de atraso.
- **Lucas Metas** (`lucas.metas@exemplo.com`): 80 livros com 35 leituras em 2026 e meta de 30 batida. Ideal para testar progresso de metas e anos de leitura no Painel.
- **Zero Novato** (`zero.novato@exemplo.com`): 0 livros. Ideal para testar telas vazias (*empty states*), onboarding e sincronização inicial.

### E-mails em desenvolvimento

Com `EMAIL_TRANSPORT=console`, os e-mails de verificação e de redefinição de senha são impressos no terminal do `pnpm dev`, com o link.

### Estante pública

A estante começa privada. Pelo ícone de compartilhar (cabeçalho, Estante ou ficha do livro), quem já confirmou o e-mail publica a estante em `/estante/{slug}` (o slug vem do nome e não muda depois) e pode torná-la privada de novo. Visitantes sem conta veem só capa, título, autor, gênero, páginas, editora, ano e Leitura (não lido, lendo, lido, abandonado); a Situação (emprestado, doado), anotações, datas de aquisição e livros doados nunca saem do servidor. Cada link traz metadados Open Graph e uma imagem gerada em `/og/estante/{slug}`; as estantes públicas declaram `noindex`.

## Variáveis de ambiente

Todas são validadas em [`env.ts`](env.ts); o modelo comentado está em [`.env.example`](.env.example).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | `postgres://…` (Neon, URL *pooled*) ou `pglite://<pasta>` |
| `DATABASE_URL_UNPOOLED` | não | Conexão direta do Neon, usada só nas migrations |
| `BETTER_AUTH_SECRET` | sim | 32+ caracteres aleatórios |
| `BETTER_AUTH_URL` | não | URL pública do app. Na Vercel, se vazia, usa o domínio de produção do projeto (produção) ou a `VERCEL_URL` (previews) |
| `NEXT_PUBLIC_APP_URL` | não | URL pública extra confiável (origem) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | não | Login com Google; sem elas, o botão avisa que está indisponível |
| `CRON_SECRET` | para cópia semanal | Segredo de 16+ caracteres para autenticar o cron da Vercel |
| `EMAIL_TRANSPORT` | não | `gmail` (padrão), `console` ou `outbox` (testes) |
| `SMTP_USER` / `SMTP_PASS` | com `gmail` | Conta Gmail e **senha de app** |

## Testes

| Script | O que faz |
|---|---|
| `pnpm test` | Unidade e integração (Vitest) |
| `pnpm test:e2e` | Fluxos no navegador e auditoria de acessibilidade (axe) contra a build de produção, com PGlite descartável |
| `pnpm test:visual` | Compara telas e modais com linhas de base versionadas (1440×900 e 390×844; tolerância de 1%). As telas principais e o login são capturados nos temas claro e escuro; as telas novas (conta, senha, toasts, listas), só no claro |

Os testes Playwright criam banco PGlite, caixa de e-mail e sessão em um diretório temporário exclusivo por execução, removido ao terminar. Não apagam `.data/dev` nem `.data/e2e`; a porta de teste (`E2E_PORT`, padrão 3100) precisa estar livre.

`pnpm test:visual --update-snapshots` regrava as linhas de base.

## Deploy (Vercel)

1. A integração GitHub → Vercel cria o deploy de produção da branch `main` e um preview por PR. O GitHub Actions executa `quality` e `e2e` em cada PR; o teste visual fica em **Actions → Visual → Run workflow**.
2. O `vercel.json` define o build (`pnpm vercel-build`). Antes das migrations, ele confere o projeto Neon e, em Preview, exige um endpoint de branch diferente do banco base.
3. Conecte dois recursos Neon ao projeto, sem prefixo nas variáveis: `bodega-literaria-db` somente em **Production** e `bodega-literaria-preview-db` somente em **Preview**. O banco base de Preview deve conter apenas dados fictícios. Em **Storage → bodega-literaria-preview-db → Projects → ⋮ → Update Project Connection → Advanced Options**, selecione **Required → Preview**, **Create a database branch for deployment → Preview** e **Resource must be active before deployment**. A integração injeta `DATABASE_URL`, `DATABASE_URL_UNPOOLED` e `NEON_PROJECT_ID`.
   - **Região:** a do banco não muda depois. O `vercel.json` fixa as funções em `gru1` (São Paulo), junto do Neon em `aws-sa-east-1`; se o banco ficar em outra região, ajuste `regions` (ex.: `iad1` para `aws-us-east-1`).
   - **Branch por preview é obrigatória:** sem ela, o build de Preview falha antes das migrations. Migrations de produção devem continuar compatíveis com a versão anterior do app durante o deploy.
4. Em **Settings → Environment Variables**:

   | Variável | Production | Preview |
   |---|---|---|
   | `ENABLE_EXPERIMENTAL_COREPACK=1` | ✓ | ✓ |
   | `BETTER_AUTH_SECRET` | ✓ | ✓ (o build falha sem ela) |
   | `EMAIL_TRANSPORT` | `gmail` | `console` (links nos logs da função) ou `gmail` |
   | `SMTP_USER` / `SMTP_PASS` | ✓ | só com `gmail` |
   | `CRON_SECRET` | ✓ | — |
   | `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✓ | opcional |
   | `BETTER_AUTH_URL` | só para forçar outro domínio | — |
   | `PRODUCTION_NEON_PROJECT_ID` | ID do projeto Neon de produção | — |
   | `PREVIEW_NEON_PROJECT_ID` | — | ID do projeto Neon de Preview |
   | `PREVIEW_BASE_DATABASE_HOST` | — | Host da URL direta do banco base de Preview |
   | `PREVIEW_BASE_POOLED_DATABASE_HOST` | — | Host da URL pooled do banco base de Preview |

   `ENABLE_EXPERIMENTAL_COREPACK` faz a Vercel usar o pnpm do campo `packageManager` (pnpm 11); sem ela, a versão é deduzida pelo lockfile (pnpm 9/10), que não entende o `pnpm-workspace.yaml` deste projeto.
5. **Google (opcional):** no Google Cloud Console, crie um "ID do cliente OAuth" (aplicativo da Web) com o URI de redirecionamento `<URL de produção>/api/auth/callback/google` (e `http://localhost:3000/api/auth/callback/google` para desenvolvimento) e defina `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Nos previews, que têm URL dinâmica, o login com Google não funciona; use e-mail e senha.
6. **Gmail:** ative a verificação em duas etapas na conta e gere uma senha de app em <https://myaccount.google.com/apppasswords>.
7. Depois do deploy, teste cadastro, e-mail de verificação, login com Google e, em **Settings → Cron Jobs**, rode o cron manualmente (**Run**).

> **`vercel env pull`:** use `--environment preview` apenas para trabalhar em uma branch isolada do Neon. O ambiente *Development* não recebe credenciais Neon automaticamente. Para desenvolvimento local, use `DATABASE_URL=pglite://./.data/dev`.

### Cópia semanal no Google Sheets

1. No **mesmo projeto Google Cloud** do cliente OAuth acima, habilite as APIs **Google Sheets** e **Google Drive**. A Drive API permite reencontrar uma planilha criada quando o Google confirmou a criação, mas a gravação do identificador no banco falhou.
2. Na tela de consentimento OAuth, configure o escopo `https://www.googleapis.com/auth/drive.file`. Esse escopo dá ao app acesso aos arquivos que ele cria ou que o usuário abre com ele; não solicite o escopo amplo `spreadsheets`. Publique a tela de consentimento para uso externo em produção e cumpra a verificação exigida pelo Google. Em modo **Testing**, um refresh token de app externo com esse escopo pode expirar em sete dias.
3. Mantenha o URI de redirecionamento OAuth `<BETTER_AUTH_URL>/api/auth/callback/google`. A rota `/api/sheets-export/callback` é apenas o retorno **interno** do Better Auth após esse callback. Defina `CRON_SECRET` (16+ caracteres aleatórios, por exemplo `openssl rand -base64 32`) nas variáveis da Vercel em **Production**.
4. Depois do deploy, a pessoa abre **Minha conta → Cópia semanal no Google Sheets → Conectar Google** e concede a permissão. O app cria uma planilha privada na conta autorizada. Cada aba `AAAA-Www` guarda um retrato de todos os livros daquela semana; metas e configurações não são exportadas. A planilha de importação informada no modal **Sincronizar planilha** é independente.
5. O cron em `vercel.json` verifica pendências diariamente às **06:00 UTC** e grava no máximo uma aba por semana. Falhas temporárias são tentadas novamente no dia seguinte; falhas de autorização pedem reconexão. Use **Vercel → Settings → Cron Jobs → View Logs** para acompanhar o resultado. A rota `/api/cron/sheets-export` exige `Authorization: Bearer <CRON_SECRET>`; `next dev` não aciona o cron automaticamente. A implementação limita o trabalho de cada invocação para caber na duração da função; antes de muitos usuários, distribua o trabalho com uma fila.

A opção **Desativar** para as novas cópias não apaga as abas antigas. Excluir a conta no app remove as configurações locais, mas a planilha criada permanece no Google Drive do usuário.

## Licenças

O código é deste projeto. As fontes Instrument Sans e Fraunces são distribuídas sob a SIL Open Font License 1.1 (ver [`public/fonts/instrument-sans/README.md`](public/fonts/instrument-sans/README.md) e [`public/fonts/fraunces/README.md`](public/fonts/fraunces/README.md)).
