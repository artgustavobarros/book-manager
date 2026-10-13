### 🦹 Bugpool — local (dry-run) · c5246d7...28021b9 (BP-03..BP-12)

**Verdict:** APPROVE WITH NITS · **Score:** 91/100 (A) · **Danger:** HIGH
Pre-pass: lint ok · typecheck ok · tests flaky (5 suítes de integração com timeout a frio; segunda execução 57/57) · Lenses: correctness-stack, security, qa, architecture · Validation: 3 confirmed / 0 rejected / 0 pre-existing

#### Findings (validated, most severe first)
1. **MEDIUM** `hooks/use-books.ts` (onMutate) + `lib/client/book-cache.ts` (revertBookPatch): duas edições seguidas no mesmo campo, ambas com falha, deixam na tela um valor que o servidor nunca gravou. Ex.: nao-lido→lido (falha) →lendo (falha) termina em "lido", porque o `prev` da edição 2 é lido do cache já otimista. Reproduzido com vitest descartável. Correção: guardar o valor confirmado pelo servidor por livro/campo (ou o `prev` da primeira mutação pendente) e reverter para ele; ou refetch no erro.
2. **LOW** `components/app/app-provider.tsx:204`: o ramo do undoRead para livro emprestado (BP-07) não tem teste → adicionar e2e/unit.
3. **LOW** `lib/client/book-cache.ts:13`: a regra "borrower só em emprestado" está duplicada em 5 lugares (2 novas no intervalo). Hoje não diverge → extrair helper de domínio.

#### Not validated (LOW, max 5)
- `hooks/use-books.ts:79`: DELETE/create fora de `bookWrites`. Um DELETE pode passar na frente de um PATCH pendente e gerar 404 + toast de erro espúrio.
- `lib/domain/insights.ts:124`: insights conta emprestado+yearRead como lido, mas o filtro "lido" da Estante não.
- `components/books/lent-badge.tsx:19`: "há N dias" congelado em `app.now` do carregamento.
- `lib/domain/backup.test.ts:72`: falta caso exatamente em BOOK_INT_MAX e em +1.
- `tests/e2e/fixes.spec.ts:160`: `waitForTimeout(300)` em asserção negativa.

Scope drift: none
Auto-fix: skipped (dry-run)

Agents: 7 (router 1 · lenses 4 · validator 1 · +2 observadores fora da skill) · Rounds: 1
