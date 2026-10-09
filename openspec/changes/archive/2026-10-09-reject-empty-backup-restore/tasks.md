## 1. Domínio e API

- [x] 1.1 `fromBackup` lança `InvalidBackupError` quando nenhum item tem título (a rota responde 400 "Arquivo inválido.")

## 2. Interface

- [x] 2.1 `RestoreHost` valida com `fromBackup` antes da confirmação e mostra o toast de arquivo inválido sem chamar a API
- [x] 2.2 A confirmação conta livros válidos e informa os itens ignorados

## 3. Testes

- [x] 3.1 Unitário: `[]`, `[{}]`, `[1,2,3]` e `[{foo},{bar}]` lançam `InvalidBackupError`
- [x] 3.2 Integração: `POST /api/books/import` com `[]`, `[{}]` e `[{foo},{bar}]` responde 400 e o acervo fica intacto
- [x] 3.3 E2E: arquivo sem livros válidos (toast, sem confirmação) e contagem de válidos/ignorados na confirmação
- [x] 3.4 Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test` e as suítes e2e/visual (falhas restantes pré-existentes na `main`)
