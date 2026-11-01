# Controles de segurança em aplicação e banco

Três medidas endurecem a superfície exposta da aplicação sem introduzir infraestrutura extra nem restringir funcionalidades existentes:

- **Criptografia de tokens OAuth em repouso**: o Better Auth grava `accessToken` e `refreshToken` criptografados (`account.encryptOAuthTokens: true`) usando `BETTER_AUTH_SECRET`. Como a integração com Google Sheets solicita o escopo `drive.file`, cifrar os tokens impede que a leitura direta da tabela `account` (backup, log ou vazamento de leitura) exponha credenciais válidas do Google Drive.
- **Rate limit de rotas pesadas no Postgres**: endpoints de escrita e consulta externa reutilizam a tabela `rate_limit` já mantida pelo Better Auth no Postgres, evitando adicionar Redis/Upstash à pilha.
- **Cabeçalhos de segurança e CSP focada**: todas as rotas respondem com `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` e `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'`. A CSP não restringe `img-src` porque `coverUrl` aceita capas `https://` de qualquer domínio público (já validado contra SSRF no servidor).
