## Context

Em `DashboardPage` (`components/painel/dashboard-page.tsx`), os 5 KPIs saem de um `map` sobre `d.kpis`. Todos são `div` com a classe `card` (`rounded-xl border border-line bg-card`) e `flex flex-col gap-3 p-5`. Quando `k.label === "Emprestados"`, o `div` ganha `role="button"`, `tabIndex={0}`, `onClick={() => setLentOpen(true)}` e `cursor-pointer transition-colors hover:border-ink`. Falta o `onKeyDown`, e por isso Enter e Espaço não fazem nada.

O arquivo já importa `IconButton` de `@/components/ui/button`. O `Button` do mesmo arquivo tem as variantes do Design System e `size="none"`, que não define altura, padding nem raio. A convenção do projeto (shadcn-first) é usar o componente de `ui/` e estilizar no ponto de uso, sem mexer em `ui/`.

Os e2e atuais abrem o modal com `page.getByText("Emprestados").click()` (`books.spec.ts`, `fixes.spec.ts`). O `stress.spec.ts` só confere que o texto aparece.

## Goals / Non-Goals

**Goals:**

- Abrir o detalhamento de empréstimos com Enter e Espaço, com semântica de botão nativa.
- Usar o `Button` de `@/components/ui/button`, como o usuário pediu.
- Manter o visual do cartão igual aos outros KPIs.

**Non-Goals:**

- Mexer em `components/ui/button.tsx` ou criar uma variante "card" lá.
- Extrair um componente para `components/custom/`. Só um ponto usa esse estilo.
- Tornar os outros KPIs clicáveis ou mudar o carrossel do mobile.

## Decisions

### 1. `Button` em vez de `onKeyDown` no `div`

O cartão "Emprestados" vira `<Button>`. O `<button>` nativo já trata Enter e Espaço, entra na ordem de Tab, é anunciado como botão sem `role` e respeita `disabled`. Também ganha o anel de foco (`focus-visible:shadow-[…]`) da base do `Button`.

- *Alternativa: `onKeyDown` para Enter e Espaço.* Mantém o `div role="button"`, mas reimplementa à mão o que o navegador já faz. Também precisa de `preventDefault` no Espaço para a página não rolar, e o cartão continua sem anel de foco.

### 2. Um elemento só no `map`, mudando a tag

Dentro do `map`, o KPI "Emprestados" renderiza `Button` e os outros continuam `div`, com o mesmo conteúdo. O conteúdo fica numa variável ou num fragmento compartilhado, para não duplicar o JSX dos três `span`.

### 3. Estilo no ponto de uso: `variant="neutral"`, `size="none"` e as classes do cartão

- `variant="neutral"` já traz `border bg-card text-ink hover:border-ink active:scale-[.97]`, que é o hover que o cartão tem hoje.
- `size="none"` tira altura, padding e raio, que voltam pela classe `card` e pelo `p-5`.
- No `className`, `card` e as classes de layout (`flex animate-acv-in snap-start flex-col gap-3 p-5`) desfazem o que a base do `Button` faz para botões de linha: `h-auto items-stretch justify-start whitespace-normal text-left font-normal`. `card` repõe a borda `border-line`, e o `cn` do projeto resolve o conflito com `border-line2` da variante a favor do `className`.
- Os `span` internos mantêm os pesos de fonte que já têm. O `font-normal` evita que o subtítulo herde o `font-semibold` da base.
- O nome acessível vem do texto do cartão ("Emprestados Ver lista → 3 fora de casa agora"), sem `aria-label`. Assim o leitor de tela anuncia também o número.
- O `aria-haspopup="dialog"` avisa que o botão abre um modal.

## Risks / Trade-offs

- [O snapshot visual do Painel muda por um detalhe (`select-none`, `active:scale` ou um pixel de layout)] → Comparar o visual antes e depois. Se só mudar o esperado, atualizar o snapshot do Painel no PR. Se mudar mais, ajustar o `className`.
- [`whitespace-nowrap` ou `justify-center` da base escapa do override e o cartão fica centralizado ou corta o texto no carrossel de 72%] → Conferir a 1280px e a 390px. O e2e visual pega as duas larguras.
