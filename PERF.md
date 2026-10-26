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
