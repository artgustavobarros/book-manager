# Controles de segurança em aplicação e banco

Medidas que endurecem a superfície exposta da aplicação sem introduzir infraestrutura extra nem restringir funcionalidades existentes.

## Dados em repouso e limites de carga

- **Criptografia de tokens OAuth em repouso**: o Better Auth grava `accessToken` e `refreshToken` criptografados (`account.encryptOAuthTokens: true`) usando `BETTER_AUTH_SECRET`. Como a integração com Google Sheets solicita o escopo `drive.file`, cifrar os tokens impede que a leitura direta da tabela `account` (backup, log ou vazamento de leitura) exponha credenciais válidas do Google Drive.
- **Rate limit de rotas pesadas no Postgres**: endpoints de escrita e consulta externa reutilizam a tabela `rate_limit` já mantida pelo Better Auth no Postgres, evitando adicionar Redis/Upstash à pilha.
- **Teto de escrita em lote**: `MAX_BULK_BOOKS` (20.000, em `lib/validation/api.ts`) limita tanto o import de backup quanto a sincronização da planilha, nesta por requisição **e** por total de livros da pessoa. O sync também valida cada inserção e cada atualização pelo `bookFieldsSchema`, que é o mesmo esquema das outras rotas de escrita — antes ele era a única porta sem limite de tamanho de campo.
- **Prazo do cache local**: o acervo persistido em IndexedDB expira em sete dias e é apagado ao sair da conta e ao excluir a conta. Fechar a aba não é sair, então o prazo cobre o que a limpeza do logout não alcança.

## Identidade

- **Vínculo social exige posse provada do e-mail**: `/link-social` é autorizado pelo Better Auth apenas pela presença de sessão, nos dois ramos (`idToken` e redirect). Um hook `before` em `lib/auth.ts` recusa a sessão cujo endereço nunca foi verificado, com o código `EMAIL_NOT_VERIFIED_FOR_LINK`.
- **Prova de posse limpa vínculos anteriores**: `onPasswordReset` e `beforeEmailVerification` apagam as contas não-`credential` do usuário. `beforeEmailVerification` é deliberado: `afterEmailVerification` também dispara na verificação de **troca** de e-mail, e ali apagar removeria um vínculo legítimo.
- **Conflito de id pertence ao dono**: `POST /api/books` aceita um `id` do cliente como chave de idempotência. Quando o id já existe em outra conta, o servidor grava com id próprio e responde como responderia a um id livre, porque os ids dos livros são públicos (a estante pública os projeta) e um status distinto contaria sobre a base alheia.

## Fluxos OAuth

- **Cancelamento restrito ao fluxo pendente**: o retorno do OAuth do export (`/api/sheets-export/callback`) é um GET que muda estado e se autoriza só pelo cookie de sessão, que é `SameSite=Lax` e portanto acompanha navegação de topo vinda de outro site. `cancelPendingSheetExport` só desativa conexões em `pending`, nos dois ramos do callback. A desativação sem escopo ficou restrita ao `POST /api/sheets-export`, cujo corpo JSON força preflight numa tentativa cross-site.
  **Não implementado**: um nonce de uso único emitido pelo `connect` fecharia também o replay de uma URL de retorno legítima.

## Cabeçalhos e busca de capas

- **Cabeçalhos de segurança e CSP focada**: todas as rotas respondem com `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()` e `Content-Security-Policy: frame-ancestors 'none'; base-uri 'self'; form-action 'self'`.
- **A CSP não restringe `img-src`** porque `coverUrl` aceita capas `https://` de qualquer domínio público. A defesa contra endereço interno fica no servidor, em `lib/services/og-covers.ts`, e vale no **ponto de busca** (a renderização da imagem OG), não no de escrita: `lib/validation/book.ts` confere apenas a forma da URL ao salvar o livro.

  A validação cobre: protocolo `https`, ausência de credenciais na URL, nomes `localhost`/`.internal`, as faixas internas de IPv4 e IPv6 — inclusive as que faltavam (`198.18/15`, `224/3`, `0/8`, `192.0.0/24`, TEST-NET, 6to4 `2002::/16`, NAT64 `64:ff9b::/96` e IPv4 embutido em IPv6) — e a **resolução do nome**: um nome só passa se todos os endereços resolvidos forem públicos. Cada salto de redirecionamento é revalidado, e o corpo é lido com teto por bytes durante o download.

  **Limite conhecido**: entre a resolução e a conexão existe uma janela de DNS rebinding, porque são duas consultas independentes — a nossa e a do `fetch`. Fechar exige fixar o endereço ao conectar (`node:https` aceita a opção `lookup`), ao custo do encaixe de teste que hoje injeta `fetch`. O portão de `content-type` (`image/jpeg|png|gif`) impede exfiltração do conteúdo, então o resíduo é sondagem cega.

## Cadeia de build

- **Actions do GitHub fixadas por SHA**: toda `uses:` nos workflows aponta para um commit, com a versão em comentário ao lado. Tag é mutável e pode ser reapontada por quem publica a action; `neondatabase/delete-branch-action` recebe `NEON_API_KEY`, então essa diferença importa.
