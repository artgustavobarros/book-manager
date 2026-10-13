## Context

`AppHeader` renderiza `WideHeader` e `NarrowHeader` ao mesmo tempo, e o CSS esconde um dos dois conforme a largura. Os dois chamam `useShelfState()` e usam `state.q` como `value` do campo e `setShelf({ q })` no `onChange`. O header fica em `AppShell`, no layout de `app/(app)`, então não desmonta quando a rota muda.

`useShelfState` lê os filtros da URL só quando `pathname === "/estante"`. Nas outras páginas, `state` vem de um `URLSearchParams` vazio. `setShelf` tem dois caminhos:

- **Na Estante:** `history.replaceState` (ou `pushState` quando muda a página), que o Next sincroniza com `useSearchParams` sem ir ao servidor.
- **Fora dela:** `router.push(shelfHref(next))` e `window.scrollTo({ top: 0 })`.

O BP-08 está no segundo caminho. Enquanto a navegação não termina, `pathname` ainda é o da página de origem, `state.q` continua `""` e o campo controlado volta a ficar vazio. A tecla seguinte gera `{ q: "<só essa letra>" }` e outro `router.push`. O último push vence, e cada um deixou sua entrada no histórico.

## Goals / Non-Goals

**Goals:**

- Nenhum caractere perdido ao digitar fora da Estante, em qualquer velocidade.
- Uma única navegação, e uma única entrada no histórico, para ir de outra página à Estante pela busca.
- Na Estante, manter o filtro a cada tecla, como hoje.

**Non-Goals:**

- Debounce da filtragem na própria Estante. A busca já é local e rápida, inclusive com 600 livros no teste de stress.
- Mudar `setShelf` ou `goShelf`, que a Estante, o Painel, Dados e os modais também usam.
- Mudar o visual ou os rótulos do header.

## Decisions

### 1. Rascunho local num hook próprio, chamado uma vez em `AppHeader`

Um hook novo, `useHeaderSearch()` em `hooks/`, devolve `{ query, setQuery, clear }`. `AppHeader` chama o hook e passa o resultado para `WideHeader` e `NarrowHeader`, que deixam de chamar `useShelfState` para a busca. O `NarrowHeader` usa `query` também no "Busca: … · editar" e no `disabled` de "Limpar".

O hook guarda `draft` em `useState`, inicializado com `state.q`. O campo é controlado por `draft`, então cada tecla aparece na hora, venha a URL depois ou não.

- *Alternativa: um rascunho em cada header.* Os dois headers estão montados ao mesmo tempo. Com dois rascunhos, redimensionar a janela no meio da digitação mostraria um texto diferente, e cada um teria sua própria navegação pendente. Um hook só evita os dois problemas.
- *Alternativa: guardar o rascunho em `useShelfState`.* Afetaria todas as telas que usam o hook. O problema é só do campo do header.

### 2. Fora da Estante, navegar na primeira tecla e entregar o resto ao chegar

`setQuery(v)` sempre faz `setDraft(v)`. Depois:

- **Na Estante:** `setShelf({ q: v })`, como hoje (`replaceState`).
- **Fora, sem navegação pendente:** marca a navegação como pendente, guardando o `pathname` de origem, e chama `setShelf({ q: v })`, que faz o `router.push` e o `scrollTo`.
- **Fora, com navegação pendente:** só atualiza o rascunho.

Um efeito que depende de `onShelf` e da pendência faz a entrega: quando a Estante abre com uma navegação pendente, limpa a pendência e, se `draft !== state.q`, chama `setShelf({ q: draft })`. Como já está na Estante, isso usa `replaceState` e não cria outra entrada no histórico.

- *Alternativa: debounce da navegação, como sugere o relatório.* Atrasa a ida à Estante a cada tecla, e o requisito diz que digitar leva à Estante. Também não resolve tudo: se a pessoa volta a digitar depois do debounce e antes de a navegação terminar, sai um segundo `router.push`. A pendência explícita garante um push só, sem atraso.
- *Alternativa: `router.replace` nas teclas seguintes.* Continuaria disparando uma navegação por tecla, cada uma cancelando a anterior, e o histórico dependeria de qual delas termina por último.

### 3. O rascunho segue `state.q` quando não há navegação pendente

Quando `state.q` muda por fora do campo ("Limpar busca", sair da Estante, voltar no histórico, um atalho que leva à Estante com outro `q`), o rascunho passa a ser `state.q`. O ajuste é feito durante o render, comparando com o `state.q` do render anterior (o padrão do React para estado derivado de props), para o campo não mostrar um quadro com o texto velho. Com navegação pendente, o ajuste é ignorado. Senão, a chegada à Estante com `?q=k` apagaria o "kindred" do rascunho antes da entrega.

### 4. Pendência cancelada se a pessoa vai para outro lugar

Se o `pathname` muda para uma página que não é a de origem nem a Estante (por exemplo, a pessoa clica em "Dados" antes de a Estante abrir), a pendência é descartada e o rascunho volta a seguir `state.q`. Assim uma navegação antiga não grava um `q` quando a pessoa chegar à Estante por outro caminho.

## Risks / Trade-offs

- [Entre o `router.push` e a entrega, a URL mostra só o começo do texto, por exemplo `?q=k`, e a Estante filtra por ele por um instante] → A entrega acontece no primeiro efeito depois de a Estante abrir. O campo mostra o texto inteiro o tempo todo, e o teste e2e confere a URL final.
- [O ajuste durante o render e o efeito de entrega podem disputar o `draft` na chegada] → O ajuste é ignorado enquanto há pendência, e a pendência só é limpa no mesmo efeito que faz a entrega.
- [Não há ambiente de teste de componente (o Vitest roda em `node`)] → A cobertura fica no Playwright, com a prova de que o teste novo falha com o código da `main`.
