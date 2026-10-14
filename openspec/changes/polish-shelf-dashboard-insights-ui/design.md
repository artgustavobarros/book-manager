## Context

Os ajustes vieram de uma revisão visual e tocam três telas (Painel, Estante e Dados) mais o carrossel e os botões flutuantes compartilhados. Estado atual relevante:

- Os botões "Terminei", "Ler" e "Devolver" do Painel são `<button>` com classes soltas (`hover:border-ink`, sem `transition` explícita), cada um com variações pequenas.
- As marcações da capa (`book-card.tsx`) usam `bg-[#1b1a17] text-white` quando ativas e `bg-white text-[#1b1a17]` quando inativas, com glifos ♥/♡/✓/✎.
- `StatusSelect` é um `<select>` nativo em pílula. O resto do app (ficha, formulário, sorteio) já usa o `Select` do Base UI em `components/ui/select.tsx`, com popup no visual do combobox.
- `book-row.tsx` e o botão de status do card usam glifos ↺ ✓ ▶ ✎ ✕. O `lucide-react` já é dependência (`components.json` com `iconLibrary: "lucide"`, usado em `ui/sonner.tsx`).
- Em Dados, `BarCard` recebe `barColor`: gênero usa `--ink`, nacionalidade `--acc` e editora `--mute`. As colunas de "Lidos por ano" usam `--acc` no ano corrente e `--ink` nos outros.
- `CarouselDots` usa botões `size-11` sem gap, então os pontos ficam a 36px uns dos outros.
- `insights().scopeCaption` gera a legenda do topo de Dados, e `insights.test.ts` a compara com o oráculo do standalone.
- A Estante tem um cabeçalho `flex-wrap` com a contagem, o título, o `SortMenu` (Radix Popover, "Ordenar <opção>") e um `Segmented` "Capas/Lista". A ordenação padrão é `recentes` (`DEFAULT_SHELF.sort`, sem `ordem` na URL).

Convenção do projeto (shadcn-first): `components/ui/*` fica como a CLI gera, o estilo vai no ponto de uso, e um uso estilizado que se repete vai para `components/custom/`.

## Goals / Non-Goals

**Goals:**
- Deixar as telas consistentes com os tokens de cor do projeto (`--acc`, `--onacc`, `--card`, `--ink`), nos dois temas.
- Trocar glifos de texto por ícones do lucide nos pontos citados.
- Reorganizar o cabeçalho da Estante até 640px sem mudar o comportamento acima disso.

**Non-Goals:**
- Migrar `SortMenu`, `Segmented` e os chips para componentes do shadcn (ficam para depois, como combinado).
- Mexer nas cores semânticas de status (donut e barras de "Livros por status" continuam com a cor de cada status).
- Trocar os outros emojis (por exemplo "📖 Começar a ler agora").
- Tirar as variantes Bodega de dentro de `ui/button.tsx`.

## Decisions

### 1. Botão de ação do Painel em `components/custom/`
Criar `components/custom/action-button.tsx`, que envolve o `Button` de `ui/button.tsx` (`variant="neutral"`, `size="xs"`) e, no ponto de uso, aplica `h-8 rounded-lg duration-200 hover:border-acc hover:text-acc focus-visible:border-acc focus-visible:text-acc`. "Terminei", "Ler" e "Devolver" passam a usá-lo. O "Ler" mantém `h-7` via `className`.
- *Por quê*: é o mesmo estilo em três lugares, então vai para `custom/` pela convenção. O `variant="neutral"` já tem `transition-[...border-color...]` e `active:scale-[.97]`. Só a duração e a cor do hover mudam.
- *Alternativa*: adicionar uma variante em `ui/button.tsx`. Descartada porque viola a regra de não estilizar o `ui/`.

### 2. Marcações da capa com tokens
Ativo: `bg-acc text-onacc`; inativo: `bg-card text-ink`. Ícones `HeartIcon` (com `fill="currentColor"` quando favorito), `CheckIcon` e `PencilIcon`, em `size-4`, com `aria-hidden`. A sombra atual fica igual.
- *Por quê*: "cores padrões do projeto quando marcadas". O acento bordô é a cor de destaque do design. No tema escuro, `--acc` e `--card` já trocam de valor sozinhos.
- *Alternativa*: usar o verde de "lido" no ✓. Descartada: misturaria duas cores de destaque na mesma pilha de ações.

### 3. `StatusSelect` sobre o `Select` do Base UI
Reescrever `components/books/status-select.tsx` em cima de `Select`, `SelectTrigger`, `SelectContent` e `SelectItem` de `components/ui/select.tsx`, passando `items` (para o `Select.Value` mostrar o rótulo) e `onValueChange`. O gatilho recebe no `className` o visual de pílula (`h-7 rounded-full border-transparent pl-6 text-xs font-semibold hover:border-line2`), o `style` com `color-mix(... 16%, var(--card))`, o ponto da cor do status posicionado à esquerda e `aria-label="Status"`. Cada item mostra o ponto da cor do status antes do rótulo. O `<span onClick={stopPropagation}>` de fora continua no lugar: o popup vai para um portal, mas os eventos sintéticos do React sobem pela árvore de componentes, então o clique num item continua sem abrir a ficha. Até 640px, o gatilho ganha `max-[640px]:min-h-11`.
- *Por quê*: é o "modelo de layout dos outros selects mais estilizados", e a ficha já usa o mesmo componente.
- *Alternativa*: estilizar o `<select>` nativo. Descartada porque o popup nativo não aceita estilo.

### 4. Ícones do lucide
Importar com o sufixo `Icon`, como em `ui/sonner.tsx`: `PlayIcon` (começar a ler), `CheckIcon` (concluir), `RotateCcwIcon` (marcar como não lido), `PencilIcon`, `Trash2Icon`, `ShuffleIcon` (sorteio), `LayoutGridIcon` e `ListIcon` (visualização). O helper `components/books/status-action.tsx` (`statusActionLabel`, `StatusActionIcon`) evita repetir o ternário de três ramos na linha da lista. O card de capa não tem mais esse botão: o seletor de status, agora na largura toda do card, já faz a troca. O comentário de `ui/combobox.tsx` ("o app não usa a biblioteca") fica desatualizado, mas o arquivo é do `ui/` e não será editado.

### 5. Cores das barras de Dados
`BarCard` perde a prop `barColor` e passa a usar `var(--acc)` fixo. Nas colunas de "Lidos por ano", o ano corrente usa `var(--acc)` e os demais `color-mix(in oklch, var(--acc) 45%, var(--card))`.
- *Por quê*: o pedido é uma cor só (a padrão). Manter a atenuação preserva o destaque do ano corrente, que a spec exige.

### 6. Remoção de `scopeCaption`
Remover o campo do tipo e do retorno em `lib/domain/insights.ts`, a asserção em `insights.test.ts` e o `<span>` em `insights-page.tsx`. O cabeçalho de Dados fica só com o título e o `Segmented`. A legenda "apenas lidos" também sai, para o topo não mudar de altura conforme o escopo.

### 7. Carrossel: item na largura toda e indicadores
- Itens: `max-[640px]:auto-cols-[100%]` nos quatro carrosséis (KPIs e listas do Painel, KPIs e gráficos de Dados). O usuário pediu que cada card ocupe toda a largura possível, e por isso não sobra mais uma fração do card seguinte aparecendo. Os indicadores e o snap continuam sinalizando que há mais itens. Antes tentei `minmax(220px,72%)`, que prendia os cards no mínimo porque o grid só cresce até o máximo quando sobra espaço, e num trilho que transborda nunca sobra; depois `max(220px,72%)`, que ainda deixava o card com 72% da largura.
- Indicadores: o botão vai de `size-11` para `h-11 w-6`, sem `gap`. Isso dá 16px entre pontos inativos (antes 36px) e um alvo de 24×44px, que atende o mínimo de 24px da WCAG 2.5.8.
- `CarouselDots`/`useCarousel` em `components/ui/carousel.tsx` foram escritos à mão pelo projeto, não vêm da CLI do shadcn. Por isso podem ser editados no lugar.

### 8. Cabeçalho da Estante até 640px, só com CSS responsivo
Nada de `matchMedia` em JS. Tudo com variantes `max-[640px]:`, para não ter hidratação divergente:
- contagem "N livros": `max-[640px]:hidden`;
- linha do título: `flex-nowrap items-center justify-between` no mobile, com o `SortMenu` ao lado do `h1`; o `Segmented` de texto ganha `max-[640px]:hidden`;
- `SortMenu` recebe `chosen = sort !== DEFAULT_SHELF.sort`. Com `chosen` falso, o rótulo da opção fica `max-[640px]:hidden`; com `chosen` verdadeiro, "Ordenar" fica `max-[640px]:sr-only`, e o nome acessível continua com "Ordenar" (o e2e de `books.spec.ts` depende disso);
- chips: o contêiner ganha `max-[640px]:flex-nowrap max-[640px]:overflow-x-auto max-[640px]:-mx-4 max-[640px]:px-4 scrollbar-none max-[640px]:snap-x`, e cada chip `shrink-0 snap-start`. Os chips são botões focáveis, então o Tab já rola a faixa e não precisa de `tabIndex` extra;
- alternância de ícones: uma linha `hidden max-[640px]:flex justify-end` logo antes da grade/lista, com `ToggleGroup` do shadcn (`pnpm dlx shadcn@latest add toggle-group`, Base UI) estilizado no uso: itens `size-11` com `LayoutGridIcon`/`ListIcon`, `aria-label` "Capas"/"Lista" e o ativo em `segClass(true)`.
- *Por quê*: pela convenção, um controle novo usa o componente do shadcn quando ele existe. O `Segmented` só aceita rótulos de texto.
- *Alternativa*: estender `Segmented` para aceitar `ReactNode`. Descartada para não aumentar um componente feito à mão que já está na fila de migração.

### 9. KPIs no padrão do card "Meta de leitura"
`components/app/kpi.tsx` exporta `kpiCardClass` e `KpiContent` (título, número e subtítulo), usados pelos KPIs do Painel e de Dados. Os tokens vêm do card da meta: título `font-semibold text-base text-ink`, número `font-title font-bold text-5xl` e padding `px-6 py-5`. O subtítulo usa `text-base text-mute`, o estilo de "de 24 livros lidos", logo abaixo do número, com `gap-3`. O título é um `span`, não um `h2`, porque o KPI de Emprestados é um `<button>` e não pode conter heading.
- *Alternativa*: copiar as classes nos dois arquivos. Descartada porque os dois blocos já tinham divergido (`leading-[1.4]` só em Dados).

### 10. Arraste dos chips com o mouse
A faixa de chips tem rolagem livre (os chips têm larguras diferentes), então o `useCarousel`, que avança de item em item, não serve. Um hook novo, `hooks/use-drag-scroll.ts`, arrasta com o botão esquerdo do mouse depois de 4px de movimento. Durante o arraste, o hook marca `data-dragging`, o que desliga o snap e a seleção de texto e troca o cursor para `grabbing`. Ele também descarta o clique que encerra um arraste, para não filtrar sem querer. Toque e trackpad continuam com a rolagem nativa.

### 11. Ícone de sorteio
`ShuffleIcon` (`size-5`) no FAB "Me surpreenda", nos estados habilitado e desabilitado (o `grayscale` sai, porque `opacity-50` basta para um SVG monocromático), e `ShuffleIcon` (`size-4`) antes do texto "Sortear outro livro".

## Risks / Trade-offs

- [Os testes e2e usam `selectOption` no `combobox "Status"`, e o gatilho do Base UI não é um `<select>`] → atualizar os três arquivos para `click()` no gatilho mais `getByRole("option", { name })`. Vale extrair um helper em `tests/support/` se ficar repetido.
- [Os snapshots visuais de Painel, Estante e Dados vão divergir] → regenerar com `--update-snapshots` depois de revisar as imagens. Ver a baseline de 10 falhas conhecidas na `main`, para não confundi-las com regressão.
- [Com `chosen` ligado ao valor padrão, escolher "Aquisição · recentes" de propósito mostra de novo só "Ordenar"] → aceitável: é a ordenação padrão, e a URL também não a registra.
- [O popup do Select dentro de um card com `onClick` pode abrir a ficha] → manter o wrapper com `stopPropagation` e cobrir no e2e (trocar o status pelo card não abre a ficha).
- [`ToggleGroup` adiciona `ui/toggle-group.tsx` e `ui/toggle.tsx`] → é o efeito esperado da convenção. Conferir se não entram dependências novas.

## Open Questions

- O pedido dizia "estante quando tiver no 640px para menos" para a regra do "Ordenar". A decisão foi aplicá-la só até 640px; acima disso, o gatilho continua "Ordenar <opção>".
