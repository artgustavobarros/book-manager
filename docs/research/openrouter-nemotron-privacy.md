# Nemotron gratuito no OpenRouter: privacidade e exemplos públicos

Consulta em 2026-11-16. Pesquisa de documentação, endpoints públicos, código e relatos de terceiros. Nenhuma chave lida, inferência autenticada feita ou configuração alterada nesta pesquisa.

## O que o erro significa

O modelo exato é `nvidia/nemotron-3.5-super-vl:free`. A [API pública de endpoints](https://openrouter.ai/api/v1/models/nvidia/nemotron-3.5-super-vl:free/endpoints) lista um único provedor, Nvidia, com prompt e completion a preço zero, e entrada de imagem. Portanto, a ausência de rota compatível com privacidade não significa que o modelo não exista ou seja pago.

A documentação separa duas camadas:

1. **Conta:** os [controles de treinamento por provedores](https://openrouter.ai/docs/guides/privacy/logging.md) têm escolhas separadas para modelos pagos e gratuitos. Opt-out exclui provedores que possam treinar com dados. O erro observado pelo agente principal nomeia especificamente `Free model training` e aponta para [Settings → Privacy](https://openrouter.ai/settings/privacy).
2. **Requisição:** [`provider.data_collection`](https://openrouter.ai/docs/guides/routing/provider-selection.md#requiring-providers-to-comply-with-data-policies) aceita `allow` e `deny`. `deny` restringe a provedores que não coletam dados. A integração deste projeto envia `dataCollection: "deny"` pelo SDK oficial; mudar apenas o toggle da conta não remove essa restrição do código.

O erro sozinho não revela se o toggle da conta está desligado. O painel não foi inspecionado; a restrição explícita da requisição já é suficiente para impedir esta rota.

O agente principal verificou também a [página exata do modelo](https://openrouter.ai/nvidia/nemotron-3.5-super-vl:free), que exibe aviso de coleta/registro pela NVIDIA. Seus dados de política indicam `training: true`, `retainsPrompts: true` e `canPublish: false`. Isso é um retrato atual, não garantia contratual futura.

Permitir roteamento a um provedor que coleta dados não é o mesmo que ativar publicação pública de prompts. O erro não pede liberação de publicação, e os [controles de coleta do próprio OpenRouter](https://openrouter.ai/docs/guides/privacy/data-collection.md) são uma camada distinta. Não é necessário ligar todos os switches de privacidade para tratar este erro.

## Como projetos públicos estão fazendo

### Permitir coleta, mas isolar dados públicos

[JorisJonkers-dev/litellm PR #43](https://github.com/JorisJonkers-dev/litellm/pull/43) relata testes em 15 modelos gratuitos: sete responderam, dois tiveram 429 upstream e seis tiveram 404 `Free model training`. O autor identifica `data_collection: deny` como restrição na requisição e muda para `allow`, exigindo também o toggle de conta **Free model training**. Mantém rotas separadas para trabalho público e não inclui fallback pago.

O [diff do PR](https://github.com/JorisJonkers-dev/litellm/pull/43/files) mostra a mudança real:

```json
{"provider":{"data_collection":"allow","allow_fallbacks":false}}
```

É um repositório pessoal/proxy de terceiros, não uma correção oficial do projeto upstream LiteLLM. O relato não prova que a mesma conta/configuração sempre terá capacidade disponível.

### Preservar o bloqueio e aceitar indisponibilidade

[faku-org/VoiceTalk PR #32](https://github.com/faku-org/VoiceTalk/pull/32) documenta exatamente `nvidia/nemotron-3.5-super-vl:free` retornando `HTTP 404 ... data policy (Free model training)` com `data_collection: deny`. O projeto opta por não relaxar a política. O mesmo relato registra Gemma gratuito com 429 upstream, problemas separados.

### Usar o modelo com sucesso, sem explicar a privacidade da conta

[ptimizeroracle/ondine PR #353](https://github.com/ptimizeroracle/ondine/pull/353) troca testes vivos para o modelo exato, usando LiteLLM (`openrouter/nvidia/nemotron-3.5-super-vl:free`). O autor relata três classificações corretas em três tentativas, de 0,9 a 5,4 segundos, enquanto Gemma retornava 429. Há exemplos de código no diff. Não é teste de leitura de capa e o relato não informa os switches de privacidade da conta; não se pode inferir sucesso com `deny`.

## Blog e Reddit

O artigo [OpenRouter's Free Model APIs in 2026](https://dev.to/lightningdev123/openrouters-free-model-apis-in-2026-working-with-request-limits-instead-of-token-caps-413f), espelhando [Pinggy](https://pinggy.io/blog/free_ai_model_apis_unlimited_tokens_openrouter/), explica na seção **What the Free Endpoints Do With Your Prompts** que os gratuitos NVIDIA registram dados e podem treinar, e que opt-out pode eliminar o único provedor. Essa parte é consistente com a documentação oficial. Seus exemplos omitem `data_collection`, cujo padrão oficial é `allow`. O artigo não constitui prova de uma chamada bem-sucedida com este projeto e contém simplificações em outras seções (por exemplo, tabela de 404); a documentação oficial prevalece.

Reddit foi tentado por busca `.json`, `old.reddit.com` e RSS. Os três acessos retornaram HTTP 403. Buscas externas não forneceram relatos verificáveis pertinentes. Nenhuma alegação foi atribuída a usuários do Reddit sem leitura da fonte.

## Aplicação a este projeto

- Para experimentar essa rota gratuita aceitando coleta/possível treinamento, são necessárias autorização explícita do usuário e revisão das duas camadas: conta e requisição. Um experimento deve usar capa pública, não fotos pessoais com rostos, ambientes ou outros dados.
- Para fotos reais de usuários, a alternativa é manter `deny` e escolher um endpoint compatível; gratuito não significa automaticamente compatível, nem todos os gratuitos têm a mesma política.
- Manter o SDK oficial e preço máximo zero é compatível com qualquer das decisões acima. Não há motivo técnico demonstrado para trocar o SDK.
- Nenhuma dessas fontes prova qualidade de OCR de capa/lombada. Isso ainda exige avaliação com fotos reais e revisão dos dados antes do cadastro.
