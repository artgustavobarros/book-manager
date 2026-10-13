# Findings após dedupe (etapa 5)

Total bruto: 11 (correctness 2 · security 0 · qa 6 · architecture 3). Nenhum par a ±3 linhas no mesmo arquivo. O F1 (qa) e o BUG-B1 do Observador B descrevem o mesmo defeito.

## MEDIUM+ (vão para validação: 1 lote sonnet)
- F1 | lib/client/book-cache.ts (teste: lib/client/book-cache.test.ts:19) | MEDIUM | qa/missing-case → defeito real alegado | Duas edições seguidas no mesmo campo e ambas falham: o onMutate da edição 2 captura `prev` do cache já otimista, e o rollback da 2 restaura o valor rejeitado da 1. Ex.: nao-lido→lido (falha), →lendo (falha) termina em "lido", que o servidor nunca gravou. | evidence: `const back = keys.filter((k) => b[k] === applied[k]); ... prev[k]` em revertBookPatch; `const prev = pickFields(book, applied)` no onMutate de hooks/use-books.ts | lentes: qa (+ Observador B, independente)
- F2 | components/app/app-provider.tsx:204 | MEDIUM | qa/missing-test | undoRead de livro emprestado (BP-07) mantém "emprestado" e zera só yearRead, mas nenhum teste cobre esse ramo. | evidence: `book.status === "emprestado" ? { yearRead: null } : { status: "nao-lido", yearRead: null }` | lentes: qa
- F3 | lib/client/book-cache.ts:13 | MEDIUM | architecture/duplicated-rule | A regra "borrower = null fora de emprestado" aparece em 5 lugares (book-cache.ts:13, validation/book.ts:143, services/books.ts:52-55, domain/backup.ts:158, domain/sheet.ts:348-351), com risco de divergência. | lentes: architecture

## LOW/NIT (máx. 5, não validados)
Escolhidos 5 de 8 (o SKILL.md não diz como escolher; critério: mais perto de comportamento visível ao usuário):
- L1 | hooks/use-books.ts:79 | LOW | architecture/incomplete-abstraction | remove (DELETE) e create não entram em bookWrites. Um DELETE logo após edição pendente pode chegar antes do PATCH, que leva 404 e mostra toast de erro.
- L2 | lib/domain/insights.ts:124 | LOW | consistency | insights conta emprestado+yearRead como lido (isRead), mas o filtro da estante usa `status === "lido"`. Drill-down Dados→Estante mostra menos livros que a contagem.
- L3 | components/books/lent-badge.tsx:19 | LOW | stale-state | "há N dias" usa app.now do carregamento da página e congela em aba aberta por muito tempo.
- L4 | lib/domain/backup.test.ts:72 | LOW | qa/boundary | falta caso exatamente em BOOK_INT_MAX e em +1.
- L5 | tests/e2e/fixes.spec.ts:160 | LOW | qa/weak-assertion | waitForTimeout(300) em asserção negativa; não verifica a ordem dos bodies.
Descartados pelo teto: (arch) createBookWriteQueue duplica createLatestSaver; (qa) backfill lent_at legado sem teste; (qa) ramos de use-header-search sem e2e.
