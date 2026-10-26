# Performance: registro de tentativas

Leia antes de propor uma otimização: o que já foi tentado, mantido ou revertido fica aqui.

## Como medir

Build de produção local (`scripts/e2e-server.sh`, banco PGlite com o acervo de referência), logado
como o usuário de referência. Lighthouse 12.8.2 mobile com `--throttling-method=devtools` (rede e
CPU realmente limitadas), mediana de 3 execuções por página. O modo padrão (`simulate`) estima o LCP
incluindo todo o JS baixado antes dele, e num servidor local isso infla o LCP de páginas cujo
maior elemento é texto.

## Tentativas

| Ideia | Antes → depois | Veredito | Por quê |
|---|---|---|---|
| `import * as z from "zod"` no lugar de `import { z }` | JS da Estante 439 → 382 KB transferidos; zod 398 → 104 KB | mantida | Com `{ z }` o Turbopack levava o zod inteiro, inclusive os locales de todos os idiomas. |
| `preload` com `fetchPriority: "high"` das 2 primeiras capas da Estante | Estante: perf 75 → 81, LCP 5,0 → 3,9 s | mantida | A capa é `background-image`: sem o preload, o download só começava depois do CSS. |
| Capas da Apple em WebP (`600x600bb.jpg` → `.webp`) | Estante: perf 81 → 94, LCP 3,9 → 2,1 s | mantida | Mesmo tamanho, 81 → 25 KB na capa do LCP. |
| `preload` das 2 primeiras capas da estante pública (`/estante/[slug]`) | perf 81 → 98, LCP 4,9 → 2,06 s | mantida | Mesmo caso da Estante: capa em `background-image` descoberta tarde. |
| Modais globais com `next/dynamic` (`ssr: false`), sempre montados | TBT Painel 176 → 167, Dados 172 → 155 ms; JS total +20 KB | revertida | Dentro do ruído: o chunk baixa logo depois da hidratação e ainda cai na janela do TBT. |
| Modais com `next/dynamic` montados só na 1ª abertura | TBT Painel 176 → 99, Dados 172 → 94, Estante 222 → 147 ms; perf 98/98/96 | revertida | A 1ª abertura passou de 133 para 501 ms (4G, CPU 4×) e 3 testes e2e quebraram: o modal aparece depois do clique e o axe pega a animação de entrada. |
| Idem, baixando os modais no `requestIdleCallback` | TBT volta a 166–200 ms | revertida | O custo só muda de lugar, continua dentro da janela do TBT. |
| Idem, baixando os modais no 1º `pointerdown`/`keydown` | 1ª abertura 795 ms | revertida | Os 5 chunks disputam a rede e a ficha chega mais tarde. |
| Tirar o preload das fontes Instrument Sans e Fraunces | FCP −80 a −130 ms; LCP de Dados 1,83 → 2,39 s; perf 94/97/96 → 93/96/93 | revertida | Sem o preload a fonte chega depois e a troca de fonte vira um LCP mais tarde. |
| Subset do Fraunces itálico só com as letras de "Literária" (80 → 5 KB) | perf 94/97/96 → 94/96/96 | revertida | Dentro do ruído: o itálico não está no caminho do FCP nem do LCP. |
| `experimental.inlineCss` | FCP ~1,65 → ~0,9 s nas 3 páginas; LCP Painel 1,65 → 0,87 s; LCP Estante 2,1 → 2,36 s; HTML comprimido ~16 → ~56 KB | revertida | O Next duplica o CSS no payload do RSC e o CSS deixa de ir para o cache. A doc do Next desaconselha quando a maioria é visitante recorrente, que é o caso aqui. Reavaliar se o público de primeira visita (estante pública) virar prioridade. |
| `browserslist` mais moderno para cortar ~14 KB de JS legado | — | não tentada | A estimativa (14 KB) fica abaixo do ruído das medições. |
