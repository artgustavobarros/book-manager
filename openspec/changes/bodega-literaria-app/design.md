## Context

O ponto de partida é o handoff do Claude Design em `design/handoff/`:

- `source/Acervo.dc.html`: a versão final do app. É um template numa DSL própria (`<sc-if>`, `<sc-for>`, `{{ }}`, `style-hover=`) mais um único class component React (`class Component extends DCLogic`) com toda a lógica: cálculos do Painel e de Dados, filtros e ordenação, parser CSV, merge da planilha, busca online e carrosséis.
- `source/Design System.dc.html` + `tokens/*.css`: tokens de cor (claro e escuro), tipografia, espaço, raios, sombras, movimento, componentes e regras de microinteração, já alinhados à escala do Tailwind.
- `Bodega Literária.html`: o mesmo app empacotado num arquivo único, que roda offline. Serve de **oráculo visual** para os testes.

Hoje tudo é client-side: `localStorage` como banco, auth falsa e SEED de 30 livros. O alvo é um app Next.js na Vercel com Postgres (Neon via Vercel Storage), auth real (Better Auth) e e-mail via Gmail SMTP. Deve suportar vários usuários, mesmo que o uso esperado seja de um usuário, e reproduzir o design pixel a pixel.

Restrições: plano gratuito (Vercel Hobby, Neon Free 0,5 GB, Gmail SMTP com ~500 envios/dia), sem domínio próprio no início e deploy via integração GitHub → Vercel.

## Goals / Non-Goals

**Goals:**
- Reproduzir fielmente todas as telas e interações do `Acervo.dc.html` final em Next.js + Tailwind.
- Persistir livros, metas anuais e configurações no Postgres, isolados por usuário, através de uma API REST em Route Handlers.
- Ter auth real e segura: cadastro aberto, e-mail verificado, recuperação de senha, Google com vinculação segura e exclusão de conta.
- Portar a lógica de domínio do standalone como **funções puras testadas**, preservando o comportamento.
- Ter uma comparação visual automatizada contra o standalone.

**Non-Goals:**
- Upload de imagens ou Vercel Blob para capas (continuam como URL externa).
- Sincronização automática agendada da planilha (a planilha é garantia; a sincronização é manual e repetível).
- Usar o Google Sheets como banco de dados ou gravar de volta na planilha.
- Compartilhar acervos entre usuários, papéis ou painel de administração.
- PWA ou modo offline, internacionalização (só pt-BR), magic link e passkeys.
- Migrar dados de um `localStorage` existente (só via backup JSON, se o usuário quiser).

## Decisions

### D1. Next.js App Router + Route Handlers como API
**Escolha:** Next.js (versão estável mais recente no início da implementação), App Router, TypeScript strict e pnpm. A stack de apoio é shadcn/ui (D10), React Hook Form + Zod (D17), T3 Env (D18) e Drizzle (D2). A persistência acontece por **Route Handlers REST** em `app/api/**`, como pedido; Server Actions não são usadas para dados.
**Por quê:** a API explícita é testável isoladamente (com fetch e Vitest), documenta o contrato e pode servir a outro cliente no futuro.
**Alternativa:** Server Actions. Menos boilerplate, mas acopla a mutação ao componente e não gera uma "API" de fato.

### D2. Neon Postgres via Vercel Storage + Drizzle ORM
**Escolha:** banco Neon criado pela aba Storage da Vercel (env vars injetadas), acessado com `drizzle-orm` sobre **`node-postgres` (`pg`) com pool**, usando a URL *pooled* do Neon, e `attachDatabasePool` (`@vercel/functions`) para fechar conexões ociosas no Fluid compute. Em desenvolvimento e testes, sem Docker nem Postgres local, o mesmo código usa o **PGlite** (Postgres em WASM) quando `DATABASE_URL=pglite://…`. Migrations com `drizzle-kit`, versionadas em `drizzle/`, aplicadas por `pnpm db:migrate` nos dois casos.
**Por quê:** o Drizzle tem adapter oficial no Better Auth (um schema só para auth e domínio) e tipa as queries. Com `pg`, há **transações interativas** reais (`db.transaction`) em produção e no PGlite, o que simplifica o import de backup, o merge da planilha e o lote de capas. O driver HTTP do Neon (planejado originalmente) não tem transações interativas nem roda contra um Postgres local.
**Alternativas:** driver HTTP do Neon com `db.batch` (descartado pelos motivos acima), Prisma (cold start e binário mais pesados) e SQL puro (perde a tipagem).

### D3. Schema de dados
Tabelas do Better Auth: `user`, `session`, `account`, `verification`, `rateLimit` (geradas pela CLI do Better Auth para o Drizzle). Tabelas do domínio:

```
books
  id               uuid pk default gen_random_uuid()
  user_id          text not null → user.id ON DELETE CASCADE
  order_no         integer                       -- "Nº de ordem"
  title            text not null
  author           text
  author_gender    text  check in ('Homem','Mulher','Não definido')  -- null = vazio
  author_ethnicity text                          -- Cor/etnia (texto livre + datalist)
  nationality      text
  publisher        text
  genre            text
  year_published   integer
  pages            integer  check > 0
  acquired_on      date
  status           book_status not null default 'nao-lido'   -- enum pg
  borrower         text
  year_read        integer
  notes            text
  cover_url        text
  favorite         boolean not null default false
  cover_checked_at timestamptz                   -- "coverTried"
  created_at, updated_at timestamptz
  index (user_id), index (user_id, order_no)

reading_goals   (user_id → user ON DELETE CASCADE, year int, target int check > 0, pk(user_id, year))
user_settings   (user_id pk → user ON DELETE CASCADE, sheet_url text, updated_at)
```

O enum `book_status` usa as chaves do standalone (`nao-lido`, `lendo`, `lido`, `emprestado`, `abandonado`, `doado`). Rótulos e cores vivem num módulo de domínio. O `order_no` não é único, porque planilhas reais podem ter números repetidos (fiel ao standalone).

### D4. Contrato da API
Todas as rotas resolvem a sessão com `auth.api.getSession({ headers })` e respondem 401 sem ela. O `user_id` vem **somente** da sessão. Payloads são validados com Zod (schemas em `lib/validation`, compartilhados com o cliente). As respostas usam camelCase, números como `number` e datas em ISO.

| Método e rota | Uso |
|---|---|
| `GET /api/books` | Acervo completo do usuário |
| `POST /api/books` | Criar (atribui `order_no` se vazio) |
| `PATCH /api/books` | Lote de até 100 `{id, ...campos}` (capas, ano lido) |
| `PATCH /api/books/:id` · `DELETE /api/books/:id` | Atualizar ou excluir (404 se não for do usuário) |
| `POST /api/books/import` | Restaurar backup (substitui tudo; aceita o formato do standalone) |
| `GET/PUT /api/goals/:year` | Meta do ano (GET devolve 24 se não existir) |
| `GET/PUT /api/settings` | `sheetUrl` |
| `POST /api/sheet-sync` | Baixa o CSV no servidor, faz o merge e devolve `{updated, added}` |
| `GET /api/cron/purge-unverified` | Vercel Cron diário (`Authorization: Bearer CRON_SECRET`) |
| `/api/auth/[...all]` | Handler do Better Auth |

### D5. Carregamento de dados e estado no cliente
**Escolha:** o layout autenticado `app/(app)/layout.tsx` (Server Component) valida a sessão e busca livros, meta do ano e configurações direto pelo Drizzle (as mesmas funções de serviço usadas pelos Route Handlers). Esses dados hidratam o **TanStack Query** (`HydrationBoundary`). As páginas são Client Components que leem do cache `['books']` e calculam tudo no cliente, como no standalone. As mutações usam `fetch` para a API com **update otimista e rollback**, mais o toast de erro.
**Por quê:** os cálculos de Painel e Dados dependem do acervo inteiro. Para um acervo pessoal (centenas a poucos milhares de livros, ~1–2 KB cada) carregar tudo uma vez é barato e mantém a lógica idêntica à do standalone. O SSR com os dados evita o flash de estado vazio.
**Alternativa:** paginação e agregações no servidor. Mais escalável, mas reescreve a lógica e quebra a fidelidade sem necessidade.

### D6. Lógica de domínio portada como funções puras
Tudo que é cálculo no `Acervo.dc.html` vira um módulo puro em `lib/domain/`, com testes Vitest escritos a partir do comportamento do standalone:
- `text.ts`: `norm`, `cmp` (collation pt-BR), `initial`, `fmtDate`, `nf`.
- `status.ts`: `STATUS`, rótulos, plurais e `stat()`.
- `cover.ts`: paleta `COVERS` + `hash` → cor e tinta da capa gerada.
- `orders.ts`: `withOrders`, `nextOrder`.
- `shelf.ts`: filtro (busca, status, favoritos, faceta), os 10 comparadores e as facetas serializáveis (`{kind, value}` em vez de função, para caber na URL).
- `dashboard.ts` / `insights.ts`: os seletores de `painel()` e `dados()` (KPIs, meta e ritmo, barras, donut, anos).
- `csv.ts`: `parseCSV` e a exportação CSV.
- `sheet.ts`: `sheetCsvUrl`, `mapHeader` (+ cor/etnia), `mapStatus`, `mapDate`, `mapGender`, detecção de gênero do autor e `mergeSheet()` (retorna `{updates, inserts}` em vez de mutar estado).
- `isbn.ts` e `lookup.ts`: `isbnOf`, `isbn10`, normalização das fontes e `titleMatch`.
- `backup.ts`: conversão de backup (string → tipos), compatível com o standalone.

O código de UI apenas consome esses módulos.

### D7. Better Auth: configuração
- `emailAndPassword`: `enabled`, `requireEmailVerification: true`, `minPasswordLength: 8`, `revokeSessionsOnPasswordReset: true`, `sendResetPassword` via o módulo de e-mail, e `onPasswordReset` marcando `emailVerified = true` (redefinir prova a posse da caixa).
- `emailVerification`: `sendOnSignUp: true`, `autoSignInAfterVerification: true`, `expiresIn` de 24h.
- `socialProviders.google`. Em `account.accountLinking`: `enabled: true`, `trustedProviders: ['google']` e **`requireLocalEmailVerified: true`** (o padrão na v1.6, explicitado). Assim o Google só vincula a contas locais verificadas e devolve `account not linked` caso contrário, o que a UI traduz para a mensagem de cadastro pendente com "Esqueci minha senha".
- `user.changeEmail` habilitado com verificação no novo endereço, e `user.deleteUser.enabled: true`, com a senha (ou sessão recente) exigida.
- `rateLimit: { enabled: true, storage: 'database' }`, com regras mais restritas para `/sign-in/email`, `/sign-up/email`, `/forget-password` e `/send-verification-email`.
- `BETTER_AUTH_URL` e `trustedOrigins` cobrindo produção, localhost e `VERCEL_URL` (previews).
- Rotas: a proteção otimista por cookie fica no `proxy.ts` (antigo `middleware.ts`, conforme a versão do Next), e a **verificação real** acontece no layout `(app)` e em cada Route Handler.
- Confirmar as APIs exatas na documentação da versão instalada durante a implementação (os nomes foram verificados para a v1.6).

### D8. E-mail: interface única, transporte Gmail SMTP
`lib/email/index.ts` expõe `sendEmail({ to, subject, html, text })`, com o transporte escolhido por env. A primeira implementação usa Nodemailer → `smtp.gmail.com:465` com `SMTP_USER` e uma **senha de app** (`SMTP_PASS`). Os templates (verificação, redefinição, troca de e-mail) ficam em `lib/email/templates.ts`, com HTML inline nas cores dos tokens, a marca de 3 lombadas em CSS e versão em texto puro, incluindo a linha "Se não foi você, ignore este e-mail."
Os Route Handlers de auth rodam no **runtime Node.js** (o Nodemailer não roda no Edge).
**Alternativas:** Resend (exige domínio verificado) e Mailjet (o remetente @gmail falha no alinhamento DMARC). A interface permite trocar de provedor depois sem mudar o resto.

### D9. Estilo: Tailwind v4 a partir dos tokens
- Os arquivos `design/handoff/tokens/*.css` são copiados para `app/styles/tokens/` sem alteração. O `globals.css` os importa e mapeia em `@theme inline` (por exemplo `--color-bg: var(--bg)`, `--color-ink: var(--ink)`, `--color-acc: var(--acc)`, `--color-status-lido: …`, `--shadow-book: …`, `--animate-acv-in: acv-in .5s var(--ease-emphasized) both`). Assim `bg-card`, `text-mute`, `border-line2` e `shadow-modal` trocam de tema sozinhos via `data-theme`.
- A fonte Hanken Grotesk (400–700) vem do `next/font/google`, exposta como `--font-sans`.
- Cada `style="…"` do template vira classes Tailwind equivalentes. `style-hover`/`style-focus`/`style-active` viram `hover:`/`focus-visible:`/`active:`. Valores dinâmicos (porcentagens de barras, cores de capa, `animation-delay` escalonado) ficam em `style` com CSS variables.
- Sem biblioteca de ícones: glifos Unicode, como no design.
- **Fonte da verdade quando houver divergência:** `Acervo.dc.html` (toast de 2,4 s, dot ativo de 20px) prevalece sobre o texto do Design System (2,6 s, 24px). Os tokens prevalecem sobre valores soltos.

### D10. Componentização com shadcn/ui
**Escolha:** usar **shadcn/ui** como base dos primitivos acessíveis (Radix por baixo), com os componentes copiados para `components/ui/` e **restilizados pelos tokens do design**. A aparência padrão do shadcn não é usada: as variáveis do shadcn (`--background`, `--foreground`, `--primary`, `--border`, `--input`, `--ring`, `--radius`…) são mapeadas para os tokens da Bodega (`--bg`, `--ink`, `--line2`, `--focus-ring`, `--radius-lg`…) no `globals.css`, e as variantes (`cva`) são reescritas para as do Design System.

| Necessidade do design | shadcn | Ajuste |
|---|---|---|
| Botões primary/outline/neutral/ghost | `Button` | Variantes reescritas; pressão `scale(.97)`; inativo 60% / 40% |
| Modais (ficha, edição, conta, planilha, surpresa) | `Dialog` | Véu 45% com `acv-fade`, painel com `acv-rise`; o focus trap e o Esc vêm do Radix |
| Confirmações (excluir, substituir acervo, empréstimo) | `AlertDialog` / `Popover` | No estilo do app, substituindo `confirm`/`prompt` |
| Menu "Ordenar" | `Popover` | Grupos com segmentado interno, seta girando 180° |
| Segmentado (abas, vista, escopo) | `ToggleGroup` | Trilho `--seg`, item ativo com `--shadow-seg` |
| Campos | `Input`, `Textarea`, `Label` | Altura, borda `line2` e anel de foco do DS |
| Formulários | `Form` (RHF + Zod) | Mensagem de erro no padrão "Erro" do DS |
| Toast | `Sonner` | Estilizado como o toast do design (tinta, centralizado, `acv-toast`, 2,4 s, um por vez) |

Continuam **customizados** (sem equivalente fiel no shadcn): `StatusSelect` (o design pede o `<select>` nativo com ponto e seta), `Chip`, `BookCover`/`MiniCover`, `Carousel`/`useCarousel` (snap, drag de mouse, dots e animação de 520 ms do standalone, mais simples que adaptar o Embla), `Kpi`, `BarList`, `Donut`, `EmptyState` e `BrandMark`.

**Por quê:** acessibilidade (foco, teclado, ARIA) pronta e código que é seu (copiado, não uma dependência opaca), sem abrir mão do pixel a pixel.
**Risco:** estilos padrão do shadcn vazando. A comparação visual (D15) pega isso.

### D17. Formulários: React Hook Form + Zod
Todos os formulários (entrar, criar conta, esqueci e nova senha, registrar/editar livro, perfil, senha, excluir conta, planilha) usam **React Hook Form** com `zodResolver`. Os schemas Zod de `lib/validation/` são **os mesmos** usados nos Route Handlers, então a regra vale igual no cliente e no servidor. Erros do servidor (por exemplo "e-mail em uso" ou "senha atual incorreta") voltam via `setError` no campo certo.

### D18. Variáveis de ambiente com T3 Env
`env.ts` usa `@t3-oss/env-nextjs` com schemas Zod, separando `server` (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_USER`, `SMTP_PASS`, `CRON_SECRET`) de `client` (`NEXT_PUBLIC_APP_URL`). O build falha se faltar alguma variável. Nenhum código lê `process.env` diretamente. A **URL do app vem só de env** (`BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL`), com fallback para `VERCEL_URL` em previews.

### D10b. Organização dos componentes
- **Primitivos** em `components/ui/` (shadcn restilizado + customizados do D10).
- **Features** em `components/{painel,estante,dados,ficha,surpresa,conta,planilha,auth}/`.
- Modais globais (ficha, edição, surpresa, conta, planilha) e toasts vivem num `AppProvider` client no layout `(app)`, já que o header abre vários deles em qualquer página.

### D11. Rotas e estado de URL
- `(auth)`: `/entrar` (abas via `?modo=cadastro`), `/verifique-email`, `/esqueci-senha` e `/redefinir-senha`.
- `(app)`: `/` (Painel), `/estante` e `/dados`.
- A Estante guarda `q`, `status`, `faceta` (`autor:Nome`), `ordem` e `vista` em search params (com `router.replace`, sem empilhar histórico). A busca do header navega para `/estante?q=…`.
- Os modais não têm rota própria (fiel ao standalone).

### D12. Tema sem flash e fuso horário
- O tema fica no cookie `bodega-tema`. O root layout lê o cookie e renderiza `<html data-theme>`. O toggle atualiza o cookie e o `dataset` (com transição de 300ms).
- A saudação, a data e o "esperado até hoje" dependem da hora local. O cliente grava o cookie `bodega-tz` (Intl) e o servidor formata com ele (padrão `America/Sao_Paulo`), evitando mismatch de hidratação.

### D13. Capas automáticas em lote
O `useAutoCovers` porta a fila do standalone (IntersectionObserver com `rootMargin` de 200px e 2 buscas simultâneas). Os resultados vão para um buffer que faz flush em `PATCH /api/books` a cada ~2 s ou a cada 20 itens (e no `pagehide`, via `sendBeacon`/`keepalive`). O cache do Query é atualizado de forma otimista. `cover_checked_at` só é gravado quando ao menos uma fonte respondeu.

### D14. Sincronização da planilha no servidor
O `POST /api/sheet-sync` lê `sheet_url` (ou o enviado no corpo, salvando-o), aplica `sheetCsvUrl`, faz o `fetch` com timeout, rejeita respostas HTML, usa `parseCSV` + `mapHeader` + `mergeSheet` (puros) contra os livros do usuário e grava numa transação (`db.transaction`). Devolve contagens; o cliente invalida `['books']`.

### D15. Verificação de fidelidade visual
- O acervo de referência é o SEED do standalone, extraído para `tests/fixtures/reference-books.json`.
- Playwright, com relógio fixo (`page.clock`) e rede externa bloqueada (sem capas):
  1. **Oráculo:** abre `design/handoff/Bodega Literária.html` via `file://`, injeta `localStorage` (acervo de referência, flags de seed, usuário, tema) e `sessionStorage` (`acervo-sessao`) e captura cada tela e estado.
  2. **App:** um banco de teste (PGlite) com um usuário de teste e o mesmo acervo (`scripts/seed-reference.ts`) captura as mesmas telas.
- A comparação é por pixel, com tolerância inicial de `maxDiffPixelRatio: 0.01`, a 1440×900 e 390×844, nos temas claro e escuro. As telas novas (verificação, redefinição, conta estendida) usam snapshots próprios, sem oráculo.

### D16. Deploy e ambientes
- `git init` → repositório no GitHub → import na Vercel (deploy de produção na `main`, preview por PR).
- Neon conectado pela aba Storage, com **branch por preview** habilitado, para que previews não escrevam no banco de produção.
- O build roda `drizzle-kit migrate` antes do `next build`.
- `vercel.json` define o cron diário de `/api/cron/purge-unverified` (o plano Hobby permite execução diária).
- Variáveis de ambiente (validadas por T3 Env, D18): `DATABASE_URL` (injetada), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_USER`, `SMTP_PASS` e `CRON_SECRET`, com um `.env.example` documentando cada uma.
- No Google Cloud Console, o OAuth client registra os redirect URIs de produção e localhost.

## Risks / Trade-offs

- **Previews sem login Google** (as URLs dinâmicas não estão registradas no OAuth) → em preview só e-mail e senha funcionam, e o botão Google mostra um aviso. Aceito.
- **Bloqueio ou limite do Gmail SMTP** (senha de app revogada, envio suspeito) → logar as falhas, mostrar "não foi possível enviar" com opção de reenviar, e manter a interface de e-mail pronta para trocar por Resend quando houver domínio.
- **E-mails caindo no spam** → texto simples, sem links encurtados, remetente com nome "Bodega Literária" e orientação na tela "Verifique seu e-mail" para olhar o spam.
- **Squatting de e-mail** (alguém cadastra o e-mail de outra pessoa) → login bloqueado até verificar, Google recusa a vinculação, "Esqueci minha senha" permite assumir a conta e o cron apaga cadastros não verificados após 7 dias.
- **Hidratação com datas e hora** → cookie de fuso (D12). Os cálculos de "ano corrente" usam o fuso do usuário nos dois lados.
- **Acervo muito grande** (milhares de livros carregados de uma vez) → aceitável no escopo (~5k livros ≈ 5–10 MB descomprimidos, com gzip na resposta). Se crescer, paginar o `GET` e mover as agregações para o servidor.
- **Fidelidade pixel a pixel vs. diferenças de renderização** (font loading, subpixel) → mesma fonte e pesos, tolerância de 1% e rede bloqueada nos dois lados. Os snapshots podem ser recalibrados com aprovação.
- **APIs externas de busca e capas** (rate limit do Google Books sem chave, CORS e indisponibilidade) → as chamadas continuam no cliente (limite por IP do usuário), os erros são tratados por fonte e as capas não encontradas ficam marcadas para não repetir.
- **Hotlink de capas quebrando com o tempo** → fora do escopo (Blob listado como non-goal). A capa gerada por título e autor é o fallback visual.
- **Divergência de texto exigida pela segurança:** o placeholder "Mínimo 6 caracteres" do design vira "Mínimo 8 caracteres" (mínimo do Better Auth). Desvio intencional.

## Migration Plan

Não há sistema em produção para migrar.

1. Criar o repositório e o projeto na Vercel, conectar o Neon e configurar as env vars e o OAuth do Google.
2. O primeiro deploy aplica as migrations no build.
3. Validar o cadastro → verificação → login em produção com um e-mail real.
4. **Rollback:** "Instant Rollback" da Vercel para o deploy anterior. As migrations são aditivas; se uma migration ruim chegar à produção, uma migration corretiva vai em seguida. O Neon permite restaurar para um ponto no tempo dentro da janela do plano.

## Open Questions

Resolvidas nesta revisão:
- **Sincronização automática:** não. A planilha é uma garantia; a sincronização fica manual e repetível.
- **Planilha no lugar do banco:** descartado. A auth exige Postgres de qualquer forma, e gravar no Sheets exigiria OAuth com escopo sensível, cotas e nenhuma transação; a planilha se mantém como fonte de importação e garantia, junto com o export CSV.
- **Cor/etnia do autor(a):** texto livre com datalist.
- **Tolerância visual:** 1% (`maxDiffPixelRatio: 0.01`).
- **URL de produção:** ainda indefinida; vem só de env (`BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL`), e os redirect URIs do Google são cadastrados quando ela existir.
- **Zod e T3 Env:** o Zod valida os formulários via `@hookform/resolvers` (e os mesmos schemas na API), e o T3 Env cuida das variáveis de ambiente. Nenhuma versão fixa de Zod é exigida além da compatível com os dois.
