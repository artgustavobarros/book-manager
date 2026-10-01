## 1. Fundação do projeto

- [x] 1.1 `git init`, `.gitignore` (Node, Next, `.env*`, artefatos do Playwright) e commit inicial com `design/handoff/` e `openspec/`
- [x] 1.2 Criar o app Next.js (App Router, TypeScript strict, pnpm, ESLint) na raiz, sem os exemplos do template
- [x] 1.3 Instalar e configurar o Tailwind v4; copiar `design/handoff/tokens/*.css` para `app/styles/tokens/` e mapear tudo em `@theme inline` no `globals.css` (cores, status, sombras, raios, durações, curvas, `animate-acv-*`)
- [x] 1.4 Configurar a Hanken Grotesk (400–700) com os arquivos do handoff (`@font-face` local; `next/font` descartado por diferença de métricas) como `--font-sans` e os estilos base do `body` conforme o design
- [x] 1.5 Configurar Vitest (unit) e Playwright (e2e + visual) com scripts `test`, `test:e2e` e `test:visual`
- [x] 1.6 Configurar o T3 Env (`env.ts` com `@t3-oss/env-nextjs`, server e client) e criar o `.env.example` documentando todas as variáveis (D18); proibir `process.env` direto via lint
- [x] 1.7 Inicializar o shadcn/ui (`components.json`, `lib/utils.ts`) e mapear as variáveis do shadcn para os tokens da Bodega no `globals.css` (claro e escuro)
- [x] 1.8 Instalar `react-hook-form`, `@hookform/resolvers` e `zod`, e adicionar os componentes shadcn `button`, `dialog`, `alert-dialog`, `popover`, `toggle-group`, `input`, `textarea`, `label`, `field` (substituto atual do `form`, usado com o `Controller` do RHF) e `sonner`

## 2. Banco de dados

- [x] 2.1 Instalar `drizzle-orm`, `drizzle-kit`, `pg` e `@electric-sql/pglite`; criar `lib/db/index.ts` (pool `pg` para o Neon, PGlite para dev/testes) e `drizzle.config.ts`
- [x] 2.2 Definir em `lib/db/schema.ts` o enum `book_status` e as tabelas `books`, `reading_goals` e `user_settings` (D3), com FKs em cascade e índices
- [x] 2.3 Gerar as tabelas do Better Auth (`user`, `session`, `account`, `verification`, `rateLimit`) via CLI do Better Auth no mesmo schema
- [x] 2.4 Gerar e versionar a migration inicial em `drizzle/`; scripts `db:generate`, `db:migrate` e `db:studio`
- [x] 2.5 Preparar o banco de desenvolvimento e teste (PGlite em `.data/`, ou uma branch Neon via `DATABASE_URL`) e documentar no README

## 3. Domínio (funções puras + testes)

- [x] 3.1 Extrair o SEED do standalone para `tests/fixtures/reference-books.json` (formato do backup do standalone)
- [x] 3.2 `lib/domain/text.ts` (`norm`, `cmp`, `initial`, `fmtDate`, `nf`) e `status.ts` (STATUS, rótulos, plurais, cores), com testes
- [x] 3.3 `lib/domain/cover.ts` (paleta + `hash` → cores da capa gerada) e `orders.ts` (`withOrders`, `nextOrder`), com testes
- [x] 3.4 `lib/domain/shelf.ts`: filtros (busca, status, favoritos, faceta serializável), os 10 comparadores e a serialização para a URL, com testes
- [x] 3.5 `lib/domain/dashboard.ts`: seletores do Painel (KPIs, meta e ritmo, esperado até hoje, lidos no ano, lendo, recentes), com testes que usam data fixa
- [x] 3.6 `lib/domain/insights.ts`: seletores de Dados (KPIs, termômetro, maiores livros, donut, barras com "Não informado", anos, atribuição), com testes
- [x] 3.7 `lib/domain/csv.ts`: `parseCSV` (`;`/`,`, aspas, BOM, CRLF) e a exportação CSV (BOM, `;`, colunas incluindo Cor/etnia), com testes
- [x] 3.8 `lib/domain/sheet.ts`: `sheetCsvUrl`, `mapHeader` (+ cor/etnia), `mapStatus`, `mapDate`, `mapGender`, a heurística de gênero do autor e `mergeSheet()` (retorna updates e inserts preservando notas, capa, páginas e ano lido), com testes cobrindo os cenários do spec
- [x] 3.9 `lib/domain/isbn.ts` e `lookup.ts` (`isbnOf`, `isbn10`, normalização das fontes, `titleMatch`, deduplicação e priorização por capa), com testes
- [x] 3.10 `lib/domain/backup.ts`: conversão do backup do standalone (strings → tipos, `fav`, `coverTried`) para o modelo e do modelo para o formato de backup, com testes de ida e volta
- [x] 3.11 `lib/validation/`: schemas Zod de livro (criar, atualizar, lote), meta, configurações, import e sync, compartilhados entre cliente e servidor

## 4. Autenticação

- [x] 4.1 `lib/email/`: interface `sendEmail`, transporte Nodemailer/Gmail SMTP (porta 465, senha de app) e templates de verificação, redefinição e troca de e-mail (HTML na paleta + texto puro)
- [x] 4.2 `lib/auth.ts`: Better Auth com o adapter Drizzle e a configuração do D7 (requireEmailVerification, minPasswordLength 8, reset com revogação de sessões e `onPasswordReset` marcando verificado, Google com `requireLocalEmailVerified`, changeEmail, deleteUser, rate limit em banco)
- [x] 4.3 `app/api/auth/[...all]/route.ts` (runtime Node.js) e `lib/auth-client.ts`
- [x] 4.4 Helper `requireSession()` para Route Handlers (401) e Server Components (redirect), e `proxy.ts`/middleware com redirecionamento otimista entre `(auth)` e `(app)`
- [x] 4.5 Tela `/entrar` fiel ao design: abas Entrar/Criar conta (`?modo=cadastro`), botão Google, divisória, campos, CTA e botão de tema; formulários com React Hook Form + Zod e mensagens de erro (credenciais, e-mail não verificado com reenvio, cadastro pendente no Google, rate limit 429)
- [x] 4.6 Telas `/verifique-email`, `/esqueci-senha` e `/redefinir-senha`, mais o estado de link inválido ou expirado, no mesmo cartão e com os componentes do Design System
- [x] 4.7 `GET /api/cron/purge-unverified` protegido por `CRON_SECRET`, excluindo não verificados com mais de 7 dias; registrar em `vercel.json`
- [x] 4.8 Testes e2e: cadastro → e-mail capturado (transporte de teste) → verificação → Painel; login bloqueado sem verificação; esqueci a senha; logout; acesso sem sessão redireciona e a API responde 401

## 5. API de dados

- [x] 5.1 Camada de serviços `lib/services/books.ts` (listar, criar com `nextOrder`, atualizar, excluir, lote, importar em transação), sempre recebendo o `userId`
- [x] 5.2 Route Handlers `/api/books` (GET, POST, PATCH lote) e `/api/books/[id]` (PATCH, DELETE), com validação Zod e 404 para livros de outro usuário
- [x] 5.3 `POST /api/books/import` (substituição atômica, compatível com o backup do standalone)
- [x] 5.4 `lib/services/goals.ts` + `GET/PUT /api/goals/[year]` (padrão 24) e `lib/services/settings.ts` + `GET/PUT /api/settings`
- [x] 5.5 `POST /api/sheet-sync`: fetch com timeout, rejeição de HTML, parse, `mergeSheet`, gravação em transação e resposta `{updated, added}`
- [x] 5.6 Testes de integração da API contra o banco de teste: isolamento entre dois usuários, validações 400, lote, import e sync com CSV de fixture

## 6. Shell do app e primitivos de UI

- [x] 6.1 Root layout com o cookie de tema (`data-theme` no SSR) e o cookie de fuso; layout `(app)` validando a sessão, carregando livros, meta e configurações e hidratando o TanStack Query
- [x] 6.2 Restilizar os componentes shadcn para o Design System (Button com as variantes + desabilitado/inválido, Dialog/AlertDialog, Input com os estados padrão, foco e erro; Popover do Radix no menu de ordenação; componentes shadcn sem uso removidos) e criar os customizados (IconButton, Chip, StatusSelect nativo, Card, Kpi, EmptyState, BrandMark), conferidos contra o Design System
- [x] 6.3 `Modal` sobre o `Dialog` do shadcn (véu `acv-fade`, painel `acv-rise`, Esc, clique fora, focus trap, retorno de foco), `ConfirmDialog` sobre o `AlertDialog`, e o toast próprio (`acv-toast`, um por vez, 2,4 s; o Sonner foi descartado por fidelidade)
- [x] 6.4 `BookCover` / `MiniCover` (capa gerada + imagem por cima, badge de status, ♥, sombra de livro) e `useCarousel`/`Carousel` portando snap, drag de mouse, dots e animação de 520 ms abaixo de 640px
- [x] 6.5 Header (marca, busca → `/estante?q=`, abas como rotas, Me surpreenda com estado desabilitado, + Registrar livro, tema, avatar) e rodapé (nova assinatura + 4 ações)
- [x] 6.6 `AppProvider` com o estado dos modais globais e hooks de dados (`useBooks`, mutações otimistas com rollback e toast de erro)

## 7. Livros: ficha, edição e status

- [x] 7.1 Modal de visualização da ficha (layout desktop e mobile, linhas de metadados com Cor/etnia, anotações, autor clicável, status, selo de empréstimo, excluir em dois cliques)
- [x] 7.2 Modal de registrar/editar (React Hook Form + o schema Zod do livro) com todos os campos (incluindo Cor/etnia com datalist), prévia de capa, chips de status, campo "Emprestado para quem?", Salvar inativo sem título e ano lido automático ao marcar "Lido"
- [x] 7.3 Mudança de status de qualquer origem; "Emprestado" abre um controle inline/mini-modal no estilo do app (substitui `window.prompt`) e sair do empréstimo limpa o nome
- [x] 7.4 Favoritar, ✓ lido/não lido e excluir pela lista (com confirmação no padrão do app, sem `window.confirm`)

## 8. Painel

- [x] 8.1 Cabeçalho (data e saudação com o fuso do usuário) e o carrossel de 5 KPIs
- [x] 8.2 Card da meta anual (progresso, marcador, linha de faltam, selo de ritmo oculto com o acervo vazio, −/+ persistindo em `/api/goals/:ano`) e "Lidos em <ano>"
- [x] 8.3 "Lendo agora" (Terminei) e "Últimos adicionados", com carrossel no mobile

## 9. Estante

- [x] 9.1 Estado da Estante em search params (q, status, faceta, ordem, vista), com chips, pílula de faceta e menu "Ordenar" (abre e fecha, Esc, clique fora, seta)
- [x] 9.2 Vista "Capas" (grid, ações no hover, seletor de status, selo de empréstimo, metadados) e vista "Lista" (tabela de 1120px, editar e excluir)
- [x] 9.3 Carregamento incremental de 18 em 18 (sentinela, "Carregando mais livros", "Fim da estante · N livros")
- [x] 9.4 Estados vazios: estante vazia (Registrar, Sincronizar, Restaurar backup) e nada encontrado (Limpar filtros)
- [x] 9.5 `useAutoCovers` (fila com IntersectionObserver, 2 simultâneas, buffer com flush em lote, `keepalive` no `pagehide`)

## 10. Dados do acervo

- [x] 10.1 Escopo, legenda e carrossel de 4 KPIs
- [x] 10.2 Termômetro e maiores livros; donut e legenda por status (clique → Estante filtrada)
- [x] 10.3 Barras por gênero, nacionalidade e editora (7 + expandir, clique → faceta) com a animação `acv-grow-x` escalonada
- [x] 10.4 Colunas de lidos por ano (`acv-grow-y`, ano corrente em acento, clique → faceta) e "Atribuir ano lido" (sem ano/todos, 5 anos, mostrar todos)
- [x] 10.5 Estado vazio da página (Registrar, Sincronizar, Restaurar backup) e carrossel de gráficos no mobile

## 11. Integrações e portabilidade

- [x] 11.1 Busca online no modal (Google, Open Library, Apple e Amazon por ISBN, em paralelo), lista de resultados e preenchimento do formulário
- [x] 11.2 Modal "Sincronizar planilha" (URL salva, `/api/sheet-sync`, mensagens, carregamento) e invalidação do acervo
- [x] 11.3 Exportar CSV e salvar backup JSON no cliente; restaurar backup via `/api/books/import` com confirmação de substituição (exceto no acervo vazio) e erro "Arquivo inválido." no padrão do app
- [x] 11.4 Modal "Me surpreenda" (sorteio sem repetir, filtro por gênero, começar a ler, editar ficha, estado sem candidatos)

## 12. Minha conta

- [x] 12.1 Formulários da conta com React Hook Form + Zod (erros do servidor via `setError`). Seção Perfil: nome e troca de e-mail com confirmação no novo endereço, mais as mensagens
- [x] 12.2 Seção Alterar senha (validações, revogação das outras sessões) e a variante para contas somente Google
- [x] 12.3 Seção Conta Google (status, vincular estando logado, desvincular só com senha definida)
- [x] 12.4 Seção Excluir conta (senha ou sessão recente, dois cliques, cascade, redirecionamento com "Conta excluída") e "Sair da conta"

## 13. Fidelidade visual e qualidade

- [x] 13.1 `scripts/seed-reference.ts`: cria um usuário de teste verificado com o acervo de referência no banco de teste
- [x] 13.2 Harness do oráculo no Playwright: abrir o standalone via `file://` com o storage injetado, relógio fixo e rede externa bloqueada
- [x] 13.3 Specs visuais pareando standalone × app para todas as telas e modais do spec `app-shell`, a 1440×900 e 390×844, nos temas claro e escuro (tolerância de 1%)
- [x] 13.4 Snapshots próprios das telas novas (verificar e-mail, esqueci a senha, nova senha, conta estendida, controle de empréstimo)
- [x] 13.5 Revisão de acessibilidade (foco visível, labels, `aria` dos botões de ícone, contraste nos dois temas) e performance (sem flash de tema nem de vazio; bundle)

## 14. Deploy

- [ ] 14.1 Criar o repositório no GitHub, importar na Vercel e conectar o Neon pela aba Storage, com branch por preview
- [ ] 14.2 Configurar as env vars (produção e preview), o OAuth client do Google (redirect URIs de produção e localhost) e a senha de app do Gmail
- [x] 14.3 Comando de build com `db:migrate` + `next build` e o cron no `vercel.json`; validar o primeiro deploy
- [ ] 14.4 Smoke test em produção: cadastro com e-mail real → verificação → registrar livro → sincronizar planilha → exportar → excluir conta
- [x] 14.5 README do projeto: stack, como rodar localmente, variáveis, testes, deploy e link do design handoff
