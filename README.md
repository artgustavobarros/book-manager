# Bodega Literária

Catálogo pessoal dos livros de casa: Painel (indicadores, meta anual, leituras), Estante (capas/lista, busca, filtros, ordenação) e Dados do acervo (gráficos). Reproduz o design do handoff em [`design/handoff/`](design/handoff/README.md).

O plano de implementação (proposta, specs, design e tasks) está em [`openspec/changes/bodega-literaria-app/`](openspec/changes/bodega-literaria-app/).

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 + shadcn/ui (restilizado com os tokens do design) · React Hook Form + Zod · T3 Env · Drizzle ORM · Postgres (Neon via Vercel Storage) · Better Auth · Nodemailer (Gmail SMTP) · TanStack Query · Vitest · Playwright.

## Rodando localmente

Requisitos: Node 24+ e pnpm (via corepack).

```bash
pnpm install
cp .env.example .env.local   # preencha BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:migrate              # cria/atualiza o banco local
pnpm dev                     # http://localhost:3000
```

### Banco de dados local

Não é preciso instalar Postgres nem Docker: com `DATABASE_URL=pglite://./.data/dev` o app usa o [PGlite](https://pglite.dev) (Postgres em WASM), persistido na pasta `.data/` (ignorada pelo git). Para apagar o banco local, remova `.data/dev` e rode `pnpm db:migrate` de novo.

Para usar um Postgres de verdade (por exemplo uma branch de desenvolvimento do Neon), troque `DATABASE_URL` por uma URL `postgres://…`.

| Script | O que faz |
|---|---|
| `pnpm db:generate` | Gera uma nova migration a partir de `lib/db/schema.ts` |
| `pnpm db:migrate` | Aplica as migrations de `drizzle/` no banco de `DATABASE_URL` |
| `pnpm db:studio` | Abre o Drizzle Studio (somente Postgres) |

O schema das tabelas de autenticação (`lib/db/auth-schema.ts`) é gerado pelo Better Auth: `npx auth@latest generate --config lib/auth.ts --output lib/db/auth-schema.ts`.

### E-mails em desenvolvimento

Com `EMAIL_TRANSPORT=console`, os e-mails (verificação, redefinição de senha) são impressos no terminal do `pnpm dev`, com o link clicável.

## Testes

| Script | O que faz |
|---|---|
| `pnpm test` | Testes de unidade e integração (Vitest, banco PGlite em memória) |
| `pnpm test:e2e` | Fluxos completos no navegador (Playwright) |
| `pnpm test:visual` | Comparação visual do app com o standalone do design |
