## Why

No modal "Me surpreenda", o campo "Sortear entre" é um `<select>` nativo que, na prática, só mostra "Todos os gêneros (N)": o usuário não consegue escolher um gênero para o sorteio. Mesmo quando os gêneros aparecem, um acervo com dezenas de gêneros vira uma lista longa demais para percorrer num select nativo, sem como filtrar.

## What Changes

- Trocar o `<select>` nativo de "Sortear entre" por um combobox do shadcn (`combobox`, baseado no Combobox do Base UI): o usuário abre a lista e escolhe um gênero, ou digita no próprio campo para reduzir as opções.
- A busca ignora maiúsculas e acentos ("ficcao" encontra "Ficção"), e cada opção continua mostrando a contagem de livros não lidos.
- Mostrar "Nenhum gênero encontrado." quando a busca não tem resultado.
- Diagnosticar e corrigir por que a lista hoje só mostra "Todos os gêneros": confirmar se os livros não lidos estão sem `genre` (dado/importação) ou se é um defeito de agrupamento em `surpriseGenres`.
- Quando nenhum livro não lido tiver gênero, o combobox mostra só "Todos os gêneros (N)" e uma dica de que dá para cadastrar o gênero na ficha do livro.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `surprise-pick`: o requisito "Filtro por gênero" passa a exigir um combobox pesquisável, com busca sem acento, estado vazio da busca e dica quando os livros não lidos não têm gênero.

## Impact

- `components/app/surprise-modal.tsx`: substituição do `<select>` pelo novo combobox.
- Novos componentes shadcn em `components/ui/` (`combobox` e sua dependência `input-group`) e a dependência `@base-ui/react`, que passa a conviver com o `radix-ui` já instalado.
- `lib/domain/surprise.ts` e `lib/domain/surprise.test.ts`: eventual correção do agrupamento de gêneros e casos de teste.
- Testes e2e/visuais do modal (`tests/e2e`, `tests/support/visual-cases.ts`).
- Sem mudança de banco ou de API.
