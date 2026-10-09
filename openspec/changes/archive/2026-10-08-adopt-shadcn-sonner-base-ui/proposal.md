## Why

O projeto foi configurado com shadcn/ui, mas as telas foram feitas à mão e os componentes instalados acabaram removidos como "sem uso" (`eb6013a`). A regra passa a ser shadcn-first: sempre que existir um componente shadcn para o caso, ele é usado. O primeiro passo é o toast, que hoje é uma store própria, e a família de primitivas padrão, que estava declarada como Radix (`radix-nova`) enquanto Select, Combobox e Autocomplete já usam Base UI.

## What Changes

- `components.json` passa de `radix-nova` para `base-nova`: o `shadcn add` passa a trazer componentes em Base UI.
- O toast próprio dá lugar ao Sonner do shadcn (`components/ui/sonner.tsx`, gerado pela CLI e sem alterações).
- `components/app/toast.tsx` mantém a API (`toast()`, `useToastVisible`, `<Toaster>`) e estiliza o Sonner no ponto de uso, com os tokens da Bodega: um por vez, ícone por tipo, nota, botão de fechar e barra de tempo.
- Os toasts passam a ser anunciados pela região viva única do Sonner ("Notificações"), educada para todos os tipos.
- A barra de tempo pausa enquanto o ponteiro está sobre o toast, junto com o timer do Sonner.
- Novas dependências: `sonner`, `next-themes` e `lucide-react` (exigidas pelo `ui/sonner.tsx`).

## Capabilities

### New Capabilities

- `ui-components`: convenção shadcn-first para componentes de interface (`ui/` como gerado pela CLI, estilo no ponto de uso, repetições em `components/custom/`, Base UI como padrão).

### Modified Capabilities

- `app-shell`: o requisito "Toasts" troca o anúncio `alert`/`status` pela região viva única do Sonner, troca o breakpoint de 640px pelo de 600px do Sonner e passa a pausar a barra de tempo no hover.

## Impact

- `components.json`, `components/ui/sonner.tsx`, `components/app/toast.tsx`.
- `package.json` / `pnpm-lock.yaml`: `sonner`, `next-themes`, `lucide-react`.
- `tests/e2e/books.spec.ts`: seletores das regiões do toast.
- Sem mudança de API, banco ou chamadores de `toast()`. Fora do escopo (registrado no `EXPLORATORY_REVIEW.md`): migrar Button/IconButton para `custom/`, demais componentes feitos à mão e primitivas Radix restantes.
