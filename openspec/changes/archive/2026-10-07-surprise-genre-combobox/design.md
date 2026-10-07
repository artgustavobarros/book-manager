## Context

O modal "Me surpreenda" (`components/app/surprise-modal.tsx`) usa um `<select>` nativo alimentado por `surpriseGenres(books)` (`lib/domain/surprise.ts`). A função agrupa os livros `nao-lido` por `norm(genre)`, descarta os que não têm gênero e ordena pela contagem. A lógica parece correta, então a lista com apenas "Todos os gêneros (167)" da captura indica, muito provavelmente, que os 167 livros não lidos estão sem `genre` (por exemplo, numa importação de planilha cuja coluna de gênero não foi reconhecida por `lib/domain/sheet.ts`). Isso precisa ser confirmado nos dados de produção antes de mexer no domínio.

O projeto usa shadcn com o estilo `radix-nova`. No registry atual, o `combobox` desse estilo é construído sobre o Combobox do `@base-ui/react` (campo de input + popup), e depende de `input-group` e de `button`. O `button.tsx` local já foi personalizado para o Design System (variantes `primary`, `outline` etc.) e não pode ser sobrescrito. Os tokens do shadcn (`--color-popover`, `--color-accent`, `--color-input`, `--color-border`) já estão mapeados em `app/globals.css` para a paleta do app. `lucide-react` não está instalado.

O modal é um `Dialog` do Radix em modo modal: ele prende o foco e aplica `pointer-events: none` no `body`, e o Esc fecha o diálogo.

## Goals / Non-Goals

**Goals:**
- Trocar o `<select>` por um combobox de gênero que aceite clique ou digitação, com busca sem acento.
- Conviver bem com o `Dialog` do Radix: clique, foco, rolagem e Esc dentro do popup.
- Descobrir por que os gêneros não aparecem e corrigir a causa (dado ou código).
- Manter o visual do app (altura de 36px, `border-line2`, `bg-card`, `text-ink`) e o layout mobile atual.

**Non-Goals:**
- Escolher mais de um gênero (chips) ou outros filtros (autor, páginas).
- Usar o combobox em outros selects do app nesta mudança.
- Editar gêneros em lote ou migrar dados de gênero automaticamente.

## Decisions

### 1. Usar o `combobox` oficial do shadcn (Base UI), sem trocar o `Dialog` para Base UI
Instalar com `pnpm dlx shadcn@latest add combobox`, recusando a sobrescrita de `components/ui/button.tsx`. Isso traz `components/ui/combobox.tsx`, `components/ui/input-group.tsx` e a dependência `@base-ui/react`.

- *Alternativa*: o padrão antigo Popover + Command (`cmdk`). Ele não é mais o `combobox` do registry para este estilo, e a busca fica num campo separado dentro do popup, quando o pedido é digitar no próprio campo.
- *Alternativa*: implementar à mão com `<input list>` / `datalist`. O visual e o comportamento variam entre navegadores, e não dá para mostrar um estado vazio.

Se a revisão do `button.tsx` mostrar que o combobox depende de variantes que o botão local não tem (`ghost`, `icon-xs`), os ajustes ficam no `combobox.tsx`/`input-group.tsx`, sem mexer no `Button` do Design System.

### 2. Ícones sem `lucide-react` e input próprio no grupo
O registry gera ícones `lucide` (`ChevronDownIcon`, `CheckIcon`, `XIcon`). Para não adicionar uma biblioteca por três ícones, trocar por SVGs inline no `combobox.tsx`, seguindo o padrão de `ModalClose`. Se o CLI instalar o `lucide-react`, remover a dependência. O `InputGroupInput` é um `<input>` simples, sem reutilizar o `Input` do Design System: o anel de foco do `Input` vazava dentro do grupo. O grupo é renderizado como `Combobox.InputGroup`, que o Base UI usa como âncora, para a lista ter a largura do campo inteiro.

### 3. Portal do popup dentro do conteúdo do modal
O popup do Base UI vai por padrão para o `body`, fora do `Dialog.Content`, onde o Radix bloqueia o ponteiro e tira o foco. `ComboboxContent` vai aceitar um `container` repassado para `ComboboxPrimitive.Portal`, e o modal passa a ref do próprio painel. Com isso, clique, rolagem e foco ficam dentro da área que o Radix permite.

- *Alternativa*: desligar o portal ou aumentar o `z-index`. Isso não resolve o `pointer-events` nem a armadilha de foco.

### 4. Esc fecha só a lista
Com a lista aberta, o Esc deve fechá-la sem fechar o modal. O Radix escuta o Esc em fase de captura no `document`, antes do Base UI, então interromper a propagação no input não basta. O `Modal` trata `onEscapeKeyDown` e chama `preventDefault()` quando o alvo está num `[role="combobox"][aria-expanded="true"]`; o Base UI continua fechando a lista. A regra vale para qualquer combobox dentro de um modal.

### 5. Valor como objeto e filtro com `norm`
O valor do `Combobox` é um `GenreOption` (`{ value, label }`) com `itemToStringLabel={o => o.label}`, para que o campo mostre o rótulo com a contagem. O filtro compara `norm(label)` com `norm(query)` usando `includes`, igual ao resto do app, garantindo que "ficcao" encontre "Ficção" sem depender do collator padrão do Base UI. Ao escolher uma opção, o modal chama `setGenre(o.value)` e `draw(o.value, pickId)`, como faz hoje no `onChange`. Ao sair do campo sem escolher, o Base UI restaura o rótulo selecionado. `null` não é aceito: a opção "Todos os gêneros" é o valor mínimo.

### 6. Dica quando não há gêneros
`surpriseGenres` já retorna só "Todos" nesse caso, e o modal só checa `options.length === 1 && unread > 0` para mostrar a dica abaixo do campo. A função de domínio não muda, salvo se o diagnóstico encontrar um defeito nela.

## Risks / Trade-offs

- [Duas bibliotecas de primitivas (Radix + Base UI) no bundle] → O combobox só carrega no modal, que já é client-side e montado sob demanda. O custo fica limitado ao Combobox do Base UI. Registrar a decisão para avaliar a migração completa depois.
- [Atualizações do registry divergirem dos ajustes locais (portal, ícones, Esc)] → Concentrar os ajustes em `components/ui/combobox.tsx` e comentar o motivo de cada um.
- [A causa real ser dado, não código] → A tarefa de diagnóstico vem primeiro. Se for dado, a correção é no mapeamento da importação ou uma orientação ao usuário, e a dica no modal cobre o caso de imediato.
- [Teclado móvel cobrir a lista a 390px] → O Base UI posiciona o popup com `--available-height`. Verificar no viewport mobile do Playwright.
