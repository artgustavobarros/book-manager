## Why

Depois de `rework-insights-kpis`, o título "Gráficos" ao lado do seletor de escopo em Dados ficou sobrando: o controle segmentado já diz o que filtra. Ocupando a largura toda, o seletor fica mais claro e mais fácil de tocar. O botão flutuante "Me surpreenda" usava borda e ícone na tinta do tema, destoando do "+ Registrar livro" logo abaixo, que é vinho.

## What Changes

- **Seletor de escopo em Dados**: sai o título "Gráficos". O controle segmentado "Todo o acervo / Apenas lidos" passa a ocupar a largura toda, com as duas opções dividindo o espaço, entre os KPIs e a grade de gráficos. Os títulos dos cards de gráfico voltam a ser `h2`, já que não há mais um `h2` de seção.
- **Botão flutuante "Me surpreenda"**: quando habilitado, a borda e o ícone usam a cor de acento do projeto (`--acc`, vinho). O estado desabilitado continua esmaecido, como antes.

## Capabilities

### New Capabilities

_Nenhuma._

### Modified Capabilities

- `collection-insights`: posição e largura do seletor de escopo, sem o título "Gráficos".
- `app-shell`: cor da borda e do ícone do botão flutuante "Me surpreenda".

## Impact

- `components/dados/insights-page.tsx`: o seletor ocupa a largura toda, sai o `h2` "Gráficos" e o `CardHead` volta a `h2`.
- `components/app/mobile-fabs.tsx`: `border-acc text-acc` no botão habilitado.
- Baselines visuais `dados/{desktop,mobile}-{light,dark}` regeradas.
