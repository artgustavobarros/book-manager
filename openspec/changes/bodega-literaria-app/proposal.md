## Why

A Bodega Literária existe hoje só como um protótipo standalone exportado do Claude Design (`design/handoff/`): um único HTML que guarda tudo no `localStorage`, tem autenticação de mentira e começa com 30 livros de demonstração. Para virar um produto real (e um projeto de portfólio), o app precisa de backend, persistência no servidor, contas de verdade e deploy na Vercel, sem perder a fidelidade visual do design aprovado.

## What Changes

- Novo app **Next.js (App Router) + TypeScript**, publicado na **Vercel** com deploy pela integração Git (GitHub → preview por PR, produção na branch principal).
- Stack de UI e validação: **shadcn/ui** (restilizado com os tokens do design), **React Hook Form + Zod** nos formulários (schemas compartilhados com a API) e **T3 Env** para validar as variáveis de ambiente. A URL do app vem só de env.
- Interface reproduzida **pixel a pixel** a partir de `design/handoff/source/Acervo.dc.html`, com **Tailwind CSS** alimentado pelos tokens de `design/handoff/tokens/*`. Telas que não existem no design (verificação de e-mail, redefinição de senha, exclusão de conta) seguem o Design System (`design/handoff/source/Design System.dc.html`).
- **Persistência real** em **Neon Postgres** (provisionado pela aba Storage da Vercel), com uma **API REST em Route Handlers** do Next.js. Livros, metas anuais e configurações pertencem a um usuário (`user_id`), e toda consulta é isolada pela sessão.
- **Autenticação real com Better Auth:** cadastro e login com e-mail e senha, **verificação de e-mail obrigatória**, "esqueci minha senha", **login com Google** com vinculação segura de contas, rate limiting e sessão em cookie httpOnly.
- **Envio de e-mail via Gmail SMTP** (Nodemailer + senha de app), atrás de uma interface trocável por Resend no futuro.
- **Minha conta** funcional: editar nome, trocar e-mail (com confirmação), trocar senha, ver ou vincular o Google e **excluir a conta** com todos os dados.
- **Meta de leitura por ano** persistida no servidor (substitui o número único em `localStorage`).
- **Sincronização recorrente com Google Sheets** feita no servidor: a URL fica salva por usuário e pode ser ressincronizada a qualquer momento.
- Busca online de livros e capas automáticas mantidas, com **gravação de capas em lote** para não gerar uma escrita por livro.
- Exportar CSV, salvar backup JSON e restaurar backup JSON mantidos. **"Restaurar backup" passa a aparecer também nos estados vazios**, seguindo o padrão de botões do Design System.
- Novo campo **Cor/etnia do autor(a)** (pendência listada no README do handoff), incluindo o mapeamento na planilha.
- **Removidos:** o SEED de 30 livros (vira só um script de desenvolvimento), a auth falsa via `sessionStorage`, todo uso de `localStorage` como fonte de dados, o `window.prompt` do empréstimo (substituído por um controle no estilo do app) e as props de ajuste da ferramenta de design (`cardSize`, `autoCovers`), que viram constantes.

## Capabilities

### New Capabilities

- `user-auth`: cadastro, login com e-mail e senha, verificação de e-mail, recuperação de senha, login com Google com vinculação segura, sessão, logout, rate limiting e proteção de rotas.
- `user-account`: modal "Minha conta" (perfil, troca de e-mail, troca de senha, conta Google vinculada, exclusão da conta e dos dados).
- `book-catalog`: modelo de dados do livro, API de CRUD isolada por usuário, mudanças de status (incluindo empréstimo), favoritos, nº de ordem por usuário e ficha do livro (visualizar, editar, excluir).
- `shelf-browsing`: página Estante, com capas ou lista, busca, chips de status, facetas, ordenação, carregamento incremental e estados vazios.
- `reading-dashboard`: página Painel, com KPIs, meta de leitura anual por ano, "Lendo agora", "Últimos adicionados" e "Lidos no ano".
- `collection-insights`: página Dados do acervo, com KPIs, gráficos por status, gênero, nacionalidade, editora e ano, atribuição de ano lido, escopo e estado vazio.
- `book-lookup`: busca online por título ou ISBN (Google Livros, Open Library, Apple Books, Amazon) e capas automáticas em fila com gravação em lote.
- `spreadsheet-sync`: sincronização recorrente com Google Sheets feita no servidor, com mapeamento de cabeçalhos e merge que preserva dados locais.
- `data-portability`: exportar CSV, salvar backup JSON e restaurar backup JSON (compatível com o formato do standalone).
- `surprise-pick`: "Me surpreenda", o sorteio de um livro não lido com filtro por gênero.
- `app-shell`: layout autenticado (header, navegação, busca global, rodapé), tema claro/escuro sem flash, toasts, modais, carrosséis abaixo de 640px e fidelidade ao design system.

### Modified Capabilities

(nenhuma; não há specs existentes em `openspec/specs/`)

## Impact

- **Código:** projeto novo do zero na raiz do repositório. `design/handoff/` fica versionado como referência imutável.
- **Dependências:** `next`, `react`, `tailwindcss`, shadcn/ui (Radix, `class-variance-authority`, `sonner`), `react-hook-form`, `@hookform/resolvers`, `zod`, `@t3-oss/env-nextjs`, `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless`, `better-auth`, `nodemailer`, `@tanstack/react-query`; testes com `vitest` e `@playwright/test`.
- **Infra:** projeto na Vercel ligado a um repositório GitHub; banco Neon via Vercel Storage (plano gratuito, 0,5 GB); OAuth client no Google Cloud Console; senha de app do Gmail; um Vercel Cron diário (compatível com o plano Hobby).
- **Variáveis de ambiente:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_USER`, `SMTP_PASS`, `CRON_SECRET`.
- **APIs externas consumidas:** Google Books, Open Library, iTunes Search, imagens da Amazon (pelo client) e CSV do Google Sheets (pelo servidor).
- **Dados:** não há migração de dados existentes. Contas novas começam vazias; quem tiver um backup JSON do standalone pode restaurá-lo.
