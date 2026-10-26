# React Doctor: achados triados

Triagem de 2026-10-26 (react-doctor 0.9.18, `--scope full`, score 75). Cada item vale só enquanto
o predicado continuar verdadeiro: confira antes de descartar o achado de novo.

## Rejeitados (o padrão casa, mas não há defeito)

- `no-floating-then-in-jsx-handler` (surprise-modal, insights-page, public-shelf, share-dialog):
  `update()` e `remove()` de `hooks/use-books.ts` e `copyText()` de `lib/client/clipboard.ts`
  nunca rejeitam, resolvem `true`/`false`. Predicado: a promessa encadeada é uma dessas.
- `no-loading-flag-reset-outside-finally` em `OnlineSearch.run` (book-modals): `searchCatalogs`
  usa `Promise.allSettled` e não lança; a saída antes de `setLoading(false)` é a guarda de busca
  antiga. Predicado: `searchCatalogs` continua sem lançar.
- `click-events-have-key-events` e `no-static-element-interactions` (book-card, book-row): o
  clique no card ou na linha é atalho de mouse; o título é um `<button>` que abre a mesma ficha
  pelo teclado. Predicado: o botão do título existe e chama `openView`.
- `async-await-in-loop` em `lib/services/books.ts`: as queries rodam em sequência dentro da mesma
  transação. No cron (`app/api/cron/sheets-export`) o laço é sequencial de propósito, com prazo
  e limite de usuários por execução.
- `js-set-map-lookups` (share-dialog, `lib/domain/share.ts`, `lib/domain/shelf.ts`): são
  `String.prototype.includes`, não buscas em array.
- `no-locale-format-in-render` em `sheet-export-section.tsx`: só renderiza no cliente, dentro
  do modal da conta, com dados de uma query do cliente; não há SSR para divergir.
- `nextjs-no-a-element` em `app/error.tsx`: depois de um erro, "Voltar ao Painel" recarrega a
  página inteira de propósito.
- `no-array-index-as-key` nos resultados da busca online (book-modals): a lista é trocada inteira
  a cada busca e os itens não têm estado.

## Observações (sem defeito; mudar só com motivo)

- `only-export-components`: afeta só o Fast Refresh em desenvolvimento. `components/ui` é shadcn e
  não é editado (convenção do projeto).
- `jsx-no-constructed-context-values` em `components/ui/toggle-group.tsx`: código do shadcn.
- `no-giant-component` e `no-high-complexity-react-function`: dividir quando uma feature mexer no
  componente, não como limpeza isolada.
