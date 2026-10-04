# Bodega Literária

Catálogo pessoal dos livros de casa: **Painel** (indicadores, meta anual, leituras em andamento), **Estante** (capas ou lista, busca, filtros, facetas, ordenação) e **Dados do acervo** (gráficos), com contas de usuário, sincronização com Google Sheets, busca de livros e capas online, exportação em CSV e backup em JSON.

Quem cria uma conta com e-mail e senha pode usar o acervo imediatamente. Um aviso lembra da confirmação do endereço até que o link enviado por e-mail seja aberto; os dados criados nesse período ficam salvos.

O app reproduz pixel a pixel o design do handoff em [`design/handoff/`](design/handoff/README.md), verificado por uma suíte visual que compara cada tela com o standalone original. O plano de implementação (proposta, specs, design e tasks) está em [`openspec/changes/bodega-literaria-app/`](openspec/changes/bodega-literaria-app/).

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
app/                  rotas: (auth) entrar/cadastro/senha · verifique-email · (app) Painel/Estante/Dados · api/
components/           app (shell, modais), books, estante, dados, painel, auth, ui (primitivos)
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
| `pnpm db:seed` | Cria o usuário de referência com o acervo do design |
| `pnpm db:studio` | Drizzle Studio (somente Postgres) |

O schema das tabelas de autenticação (`lib/db/auth-schema.ts`) é gerado pelo Better Auth: `npx auth@latest generate --config lib/auth.ts --output lib/db/auth-schema.ts`.

### E-mails em desenvolvimento

Com `EMAIL_TRANSPORT=console`, os e-mails de verificação e de redefinição de senha são impressos no terminal do `pnpm dev`, com o link.

## Variáveis de ambiente

Todas são validadas em [`env.ts`](env.ts); o modelo comentado está em [`.env.example`](.env.example).

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | sim | `postgres://…` (Neon, URL *pooled*) ou `pglite://<pasta>` |
| `DATABASE_URL_UNPOOLED` | não | Conexão direta do Neon, usada só nas migrations |
| `BETTER_AUTH_SECRET` | sim | 32+ caracteres aleatórios |
| `BETTER_AUTH_URL` | em produção | URL pública do app (nos previews usa a `VERCEL_URL`) |
| `NEXT_PUBLIC_APP_URL` | não | URL pública extra confiável (origem) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | não | Login com Google; sem elas, o botão avisa que está indisponível |
| `EMAIL_TRANSPORT` | não | `gmail` (padrão), `console` ou `outbox` (testes) |
| `SMTP_USER` / `SMTP_PASS` | com `gmail` | Conta Gmail e **senha de app** |

## Testes

| Script | O que faz |
|---|---|
| `pnpm test` | Unidade e integração (Vitest). Os cálculos do domínio são comparados com a lógica do próprio standalone |
| `pnpm test:e2e` | Fluxos no navegador e auditoria de acessibilidade (axe) contra a build de produção, com PGlite descartável |
| `pnpm test:visual` | Compara 10 telas e modais com o standalone (1440×900 e 390×844, claro e escuro; tolerância de 1%) e as telas novas com linhas de base próprias |

`pnpm test:visual --update-snapshots` regrava as linhas de base das telas que não existem no design.

## Deploy (Vercel)

1. Crie um repositório no GitHub e envie este projeto.
2. Na Vercel, importe o repositório (preset Next.js). O `vercel.json` já define o build (`pnpm vercel-build`, que roda as migrations antes do `next build`).
3. **Storage → Create Database → Neon**, conectado ao projeto, com branch por preview habilitada. A integração injeta `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
4. Em **Settings → Environment Variables**, defina `BETTER_AUTH_SECRET`, `SMTP_USER`, `SMTP_PASS` e `EMAIL_TRANSPORT=gmail` (Production e Preview) e `BETTER_AUTH_URL` (só Production, com a URL definitiva).
5. **Google (opcional):** no Google Cloud Console, crie um "ID do cliente OAuth" (aplicativo da Web) com o URI de redirecionamento `<BETTER_AUTH_URL>/api/auth/callback/google` (e `http://localhost:3000/api/auth/callback/google` para desenvolvimento) e defina `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Nos previews, que têm URL dinâmica, o login com Google não funciona; use e-mail e senha.
6. **Gmail:** ative a verificação em duas etapas na conta e gere uma senha de app em <https://myaccount.google.com/apppasswords>.

## Licenças

O código é deste projeto. A fonte Hanken Grotesk é distribuída sob a SIL Open Font License 1.1 (ver [`public/fonts/hanken-grotesk/README.md`](public/fonts/hanken-grotesk/README.md)).
