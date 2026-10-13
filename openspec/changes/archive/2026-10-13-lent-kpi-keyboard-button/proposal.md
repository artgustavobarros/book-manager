## Why

Pelo teclado, não dá para abrir a lista de empréstimos a partir do KPI "Emprestados" do Painel (BP-09 do `BUGPOOL_REPORT.md`). O cartão é um `div role="button" tabIndex={0}` que só tem `onClick`. Ele recebe foco e se anuncia como botão, mas Enter e Espaço não fazem nada. Quem navega por teclado ou usa leitor de tela fica sem acesso ao detalhamento.

## What Changes

- O cartão do KPI "Emprestados" passa a ser o `Button` de `@/components/ui/button`, um `<button>` de verdade. Enter e Espaço passam a abrir o modal "Livros emprestados", como o clique já faz.
- O estilo do cartão fica no ponto de uso, por `className` e props (`variant`, `size`). `components/ui/button.tsx` não muda.
- O visual do cartão continua o mesmo: borda, fundo, hover com a borda em tinta e o "Ver lista →". Ganha o anel de foco dos botões do Design System.
- Os outros quatro KPIs continuam como `div` sem interação.
- O requisito "Detalhamento de empréstimos no Painel" da spec `reading-dashboard` ganha a regra de acesso por teclado e um cenário.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `reading-dashboard`: no requisito "Detalhamento de empréstimos no Painel", o KPI "Emprestados" MUST ser um botão acessível pelo teclado, que abre o detalhamento com Enter ou Espaço.

## Impact

- `components/painel/dashboard-page.tsx`, no `map` dos KPIs em `DashboardPage`.
- Teste e2e novo para abrir o detalhamento pelo teclado. Os e2e atuais que clicam em "Emprestados" (`books.spec.ts`, `fixes.spec.ts`) continuam valendo.
- Não muda API, rota nem banco. O snapshot visual do Painel pode mudar por alguns pixels, e isso precisa ser conferido.
