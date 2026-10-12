## Context

`mergeSheet` (`lib/domain/sheet.ts`) trabalha no formato legado do standalone. Para cada linha casada, copia os campos não vazios da planilha sobre o livro, preserva anotações, capa, páginas e ano lido do app e gera um diff só com os campos que mudaram. As linhas sem par viram inserções via `legacyToFields`, que já zera `borrower` fora de "emprestado". Logo depois, porém, o resultado sobrescreve o campo com `borrower: toText(a.borrower)`, que é o comportamento do standalone.

`applyMerge` aplica o diff. Um comentário diz que "a planilha não mexe em 'emprestado para' além do que trouxe explicitamente", e o código passa a `toValues` os campos sem o `status`. É justamente `toValues` que limpa o `borrower` quando o status deixa de ser "emprestado". O `lentAt` já era tratado à parte, com `lentAtOnUpdate(status)`.

## Goals / Non-Goals

**Goals:**

- Fazer o merge da planilha seguir a mesma regra do resto do app: só livro emprestado tem quem pegou.
- Limpar os nomes fantasma que sincronizações anteriores deixaram, na próxima sincronização que casar o livro.

**Non-Goals:**

- Limpar os nomes fantasma de livros que a planilha não traz mais. Isso exigiria uma migration de dados (`UPDATE books SET borrower = NULL WHERE status <> 'emprestado'`). O nome fantasma não aparece na tela, e o próximo empréstimo pede o nome de novo, apenas pré-preenchido.
- Mudar o pré-preenchimento do modal "Emprestado para quem?" com o `borrower` atual.

## Decisions

### 1. A regra entra no `mergeSheet`, sobre o livro já mesclado

Depois de aplicar a linha e preservar os campos do app, `mergeSheet` faz `x.borrower = ""` quando `x.status !== "emprestado"`. A comparação usa o status final (o da planilha ou, se a célula estiver vazia, o do app). O diff então gera `borrower: null` só quando havia um nome. Assim cobre os dois casos: o livro que sai de "emprestado" e o nome fantasma antigo.

### 2. `applyMerge` usa `toUpdateValues`

`toUpdateValues(fields)` é o que o PATCH e o lote usam: `toValues` com o `status` (que limpa o `borrower`) e `lentAtOnUpdate`. Trocar o `SET` montado à mão por ele protege contra um diff que traga só o `status`, mesmo que `mergeSheet` mude no futuro.

- *Alternativa: só a correção no `mergeSheet`.* O diff já traria `borrower: null`, mas o serviço continuaria aceitando um estado inválido. Foi descartada porque o custo da defesa em profundidade é uma linha.

### 3. Divergência intencional do standalone

O `runSync()` do standalone mantém o nome. O teste de paridade (`mergeSheet × standalone`) continua passando porque o CSV de referência não tem esse caso. Os testes novos documentam o comportamento do app.
