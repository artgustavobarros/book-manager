## Why

A busca do header perde caracteres quando a pessoa começa a digitar fora da Estante (BP-08 do `BUGPOOL_REPORT.md`). O campo é controlado por `state.q` de `useShelfState`, que fora de `/estante` é sempre vazio. Cada tecla chama `setShelf({ q })`, que nesse caso faz `router.push(shelfHref(...))` e `window.scrollTo`. Até a navegação terminar, o campo volta a ficar vazio e a próxima tecla parte do zero. Quem digita "kindred" rápido no Painel chega à Estante com `?q=d` ou outra letra solta, e cada tecla deixa uma entrada no histórico, então o "voltar" passa por várias Estantes antes de chegar ao Painel.

## What Changes

- O header guarda o texto da busca num rascunho local, e é esse rascunho que o campo mostra. Nenhuma tecla se perde enquanto a navegação não termina.
- Fora da Estante, a primeira tecla navega para `/estante` uma vez só, com `router.push` e `scrollTo`. As teclas seguintes só atualizam o rascunho. Ao chegar à Estante, o rascunho completo vai para `?q=` com `replaceState`, sem criar outra entrada no histórico.
- Na Estante, o comportamento continua o de hoje: cada tecla atualiza `?q=` com `replaceState`.
- O rascunho acompanha mudanças de `q` que vêm de fora do campo: "Limpar busca", sair da Estante, voltar no histórico.
- O header largo e o compacto passam a usar o mesmo rascunho, calculado uma vez em `AppHeader`.
- O requisito "Busca global" da spec `shelf-browsing` ganha a regra e os cenários.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `shelf-browsing`: no requisito "Busca global", digitar fora da Estante MUST levar à Estante com o texto inteiro, criando uma única entrada no histórico.

## Impact

- `components/app/app-header.tsx` (`WideHeader`, `NarrowHeader`, `AppHeader`) e um hook novo para o rascunho da busca em `hooks/`.
- `hooks/use-shelf-state.ts` continua igual: `setShelf` e `goShelf` mantêm a mesma API para as outras telas.
- Teste e2e novo para digitar rápido a partir do Painel. Não muda API, rota, banco nem o visual do header.
