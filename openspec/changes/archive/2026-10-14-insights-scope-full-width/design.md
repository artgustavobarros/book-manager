## Context

O seletor de escopo foi para uma linha "Gráficos" em `rework-insights-kpis`. O botão flutuante "Me surpreenda" (`components/app/mobile-fabs.tsx`) usa `border-ink text-ink`.

## Goals / Non-Goals

**Goals:** seletor na largura toda, sem título; FAB de sorteio na cor de acento.

**Non-Goals:** mudar o `Segmented` compartilhado, o botão "Sortear outro livro" do modal ou o FAB desabilitado.

## Decisions

- **Largura toda pelo uso, não pelo componente**: `className="w-full …"` no container e `itemClassName="flex-1 …"` nos itens, no próprio `insights-page.tsx`, sem mexer em `components/ui/segmented.tsx`.
- **Hierarquia de títulos**: sem o `h2` "Gráficos", os títulos dos cards voltam a `h2`, para não pular do `h1` para o `h3`.
- **Acento por token**: `border-acc text-acc` acompanha o tema (vinho no claro, rosado no escuro), como o "+ Registrar livro".

## Risks / Trade-offs

- [Captura "lista de nacionalidades da ficha · desktop" instável] → já falha de forma intermitente na main (3 de 4 execuções), sem relação com esta mudança.
