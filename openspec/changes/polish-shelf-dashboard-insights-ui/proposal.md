## Why

Uma revisão visual do Painel, da Estante e de Dados levantou detalhes que destoam do resto da Bodega: botões de ação com hover seco e sem a cor de acento, marcações da capa em preto e branco, um seletor de status nativo diferente dos selects estilizados, glifos de texto (↺ ✓ ▶ ✎ ✕ 🎲) no lugar de ícones, barras de gráfico em três cores diferentes e um cabeçalho de Estante apertado no celular. São ajustes pequenos, mas juntos deixam a interface menos coesa, principalmente até 640px.

## What Changes

- **Botões de ação do Painel** ("Terminei", "Ler" e "Devolver"): hover com transição de 200 ms em que a borda e o texto passam para a cor de acento (bordô) do projeto.
- **Marcações sobre a capa** (♥ favorito, ✓ lido): quando ativas, usam a cor de acento do projeto em vez de preto; inativas, o fundo de cartão com tinta do tema.
- **Seletor de status abaixo do livro** (cards e linhas da Estante): troca o `<select>` nativo pelo `Select` do Base UI (`components/ui/select.tsx`), no mesmo visual de popup dos outros selects, mantendo a pílula com o ponto da cor do status.
- **Ícones da Estante**: as ações da lista (alternar status, editar, excluir) e as marcações da capa passam a usar ícones do `lucide-react` (já é dependência).
- **Status no card**: sai o botão de ação rápida de status ao lado do seletor no card de capa, porque o seletor já faz a troca; o seletor passa a ocupar a largura toda do card. Na lista, o botão continua.
- **Barras em Dados**: gênero, nacionalidade e editora usam a mesma cor de acento; em "Lidos por ano", o ano corrente fica com o acento pleno e os demais com o acento atenuado (sem preto).
- **Ícone de sorteio**: o 🎲 do botão flutuante "Me surpreenda" e de "Sortear outro livro" vira o ícone `Shuffle` do lucide.
- **Indicadores dos carrosséis**: menos espaço entre os pontos, sem perder a área de toque de 44px de altura.
- **Legenda de escopo em Dados**: remove a frase "Gráficos calculados com todo o acervo (N livros)" e a variante "apenas com os N livros lidos". O controle segmentado já mostra o escopo. **BREAKING** para `insights().scopeCaption`, que deixa de existir.
- **Carrosséis na largura toda**: cada item dos carrosséis (KPIs, listas do Painel e gráficos de Dados) ocupa toda a largura útil da tela, um por vez, sem espremer o conteúdo.
- **Limpar busca no celular**: sai o botão "Limpar" ao lado do campo de busca do header compacto; no lugar, um ícone "x" dentro do campo apaga a consulta e só aparece quando há texto.
- **Data do Painel**: a data de hoje continua acima da saudação, mas alinhada à direita e no estilo de "de 24 livros lidos".
- **KPIs no padrão da meta**: os KPIs do Painel e de Dados passam a usar o título e o número do card "Meta de leitura" (mesma fonte, tamanho e cor), num componente compartilhado; o subtítulo segue o estilo de "de 24 livros lidos".
- **Estante até 640px**:
  - sai a contagem "N livros" acima do título;
  - "Estante" e o gatilho de ordenação ficam na mesma linha (`justify-between`); o gatilho mostra só "Ordenar" até a pessoa escolher uma ordenação diferente da padrão e, a partir daí, mostra a opção escolhida;
  - os chips de status viram uma faixa com rolagem horizontal (carrossel), sem quebra de linha, que também rola arrastando com o mouse;
  - "Capas"/"Lista" vira um par de botões de ícone alinhado à direita, logo acima da lista de livros.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `shelf-browsing`: cabeçalho, ordenação, chips e alternância de visualização da Estante até 640px; seletor de status em Select estilizado; ícones nas ações da lista e da capa; cor de acento nas marcações ativas da capa.
- `collection-insights`: tipografia dos KPIs; remove a legenda de escopo; cor única de acento nas barras e nas colunas de "Lidos por ano".
- `reading-dashboard`: hover dos botões de ação ("Terminei", "Ler", "Devolver"); tipografia dos KPIs; posição e estilo da data no cabeçalho.
- `app-shell`: "x" de limpar dentro do campo de busca do header compacto; espaçamento dos indicadores e itens dos carrosséis na largura toda; ícone do botão flutuante "Me surpreenda".
- `surprise-pick`: ícone do botão "Sortear outro livro".

## Impact

- Componentes: `components/painel/dashboard-page.tsx`, `components/books/book-card.tsx`, `components/books/book-row.tsx`, `components/books/status-select.tsx`, `components/estante/shelf-page.tsx`, `components/dados/insights-page.tsx`, `components/ui/carousel.tsx` (só o `CarouselDots`, que é do projeto, não da CLI do shadcn), `components/app/app-header.tsx`, `components/app/mobile-fabs.tsx`, `components/app/surprise-modal.tsx`.
- Novo em `components/custom/`: botão de ação compacto do Painel, se o mesmo estilo se repetir (convenção shadcn-first).
- Domínio: `lib/domain/insights.ts` e `lib/domain/insights.test.ts` (remoção de `scopeCaption`).
- Testes: os e2e que usam `getByRole("combobox", { name: "Status" }).selectOption(...)` (`tests/e2e/books.spec.ts`, `tests/e2e/fixes.spec.ts`, `tests/visual/new-screens.spec.ts`) passam a abrir o Select e escolher a opção; `tests/e2e/stress.spec.ts` procura "600 livros", que some só abaixo de 640px; os snapshots visuais de Painel, Estante e Dados precisam ser regenerados.
- Sem mudança de API, banco ou dependências (o `lucide-react` já está no `package.json`).
