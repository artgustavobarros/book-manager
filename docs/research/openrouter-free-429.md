# OpenRouter: Gemma gratuito e erro 429

Consulta em 2026-11-16. Pesquisa somente documental e de endpoints públicos; a reprodução autenticada abaixo foi realizada pelo agente principal, sem registrar chave ou foto.

## Fatos oficiais

- O catálogo público identifica `google/gemma-4-31b-it:free` como **Google: Gemma 4 31B (free)**, com `pricing.prompt: "0"` e `pricing.completion: "0"`, e suporte a entrada de imagem. Fonte: [API de modelos](https://openrouter.ai/api/v1/models) e [página do modelo](https://openrouter.ai/google/gemma-4-31b-it:free).
- O 429 pode vir do OpenRouter (limites da plataforma) **ou do provedor upstream** (rate limit ou capacidade). Não é, por si só, evidência de que o usuário gastou sua cota. Fonte: [Limits — Handling 429 errors](https://openrouter.ai/docs/api_reference/limits#handling-429-errors).
- Variantes `:free` têm limite padrão de 20 requisições/minuto; o teto diário é 50 com menos de 10 créditos comprados e 1.000 com pelo menos 10. A documentação separa esses limites dos limites upstream. Fonte: [Limits — Rate limits](https://openrouter.ai/docs/api_reference/limits#rate-limits).
- A documentação recomenda respeitar `Retry-After`, usar espera progressiva e, para limites upstream, considerar outros modelos/provedores elegíveis. Comprar créditos para aumentar o teto diário não garante resolver um bloqueio upstream. Fonte: [Limits — Handling 429 errors](https://openrouter.ai/docs/api_reference/limits#handling-429-errors).

## Observação local sanitizada

O agente principal reproduziu uma chamada mínima de texto pelo SDK oficial, sem foto, mantendo privacidade `dataCollection: "deny"` e preço máximo zero. Recebeu:

```text
HTTP 429
message: Provider returned error
provider_name: Google AI Studio
raw: google/gemma-4-31b-it:free is temporarily rate-limited upstream.
```

A continuação da mensagem sugere tentar mais tarde ou usar chave própria do provedor ([BYOK](https://openrouter.ai/docs/guides/overview/auth/byok)). O link específico do workspace foi omitido. A consulta final de `GET /api/v1/key` retornou `free_model_daily_requests: { used: 0, limit: 50, remaining: 50 }`, confirmando cota diária gratuita livre. Os campos `usage: 0` e `usage_daily: 0` medem gasto monetário e, sozinhos, não comprovariam isso. O diagnóstico de **limitação upstream** vem da mensagem explícita do erro.

## Relatos públicos independentes

1. [thitami/llmgate #5](https://github.com/thitami/llmgate/issues/5), aberto em 2026-11-10: monitor do mesmo `google/gemma-4-31b-it:free` registrou duas sondagens consecutivas com 429. É relato de disponibilidade, não prova sobre a cota desta conta.
2. [zed-industries/zed #63188](https://github.com/zed-industries/zed/issues/63188): autor relata limitação intermitente de pool upstream no OpenRouter; a sequência publicada começa com 429 e depois mostra chamadas 200. É reprodução de terceiro, não confirmação de que não existia uso anterior na conta.

Tentativa de pesquisar Reddit foi bloqueada e buscadores apresentaram desafio automatizado. Nenhum relato de Reddit foi usado como evidência.

## Conclusão

O modelo selecionado é gratuito. A falha reproduzida é uma limitação temporária do provedor Google AI Studio que atende a rota gratuita do OpenRouter. Ela pode ocorrer antes de uma primeira inferência bem-sucedida; a cota pessoal não reserva capacidade upstream. Não há evidência de necessidade de pagar para corrigir este caso, nem garantia de que esperar resolverá imediatamente. Nenhuma política de privacidade ou modelo pago foi habilitado nesta investigação.
