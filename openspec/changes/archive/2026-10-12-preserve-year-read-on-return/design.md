## Context

O status do livro mistura duas coisas: a situação de leitura (`nao-lido`, `lendo`, `lido`, `abandonado`) e onde o livro está (`emprestado`, `doado`). Um livro lido que é emprestado troca `lido` por `emprestado`, e o status anterior se perde. O que sobra da leitura é o `yearRead`, que `confirmLend` não toca.

Na devolução, `returnBook(book, returnStatus = "nao-lido")` grava `status: "nao-lido"`, `borrower: null` e `yearRead: null`. Ninguém passa `returnStatus`: `LentBadge` (card e linha) e o "Devolver" do detalhamento de empréstimos do Painel chamam `app.returnBook(b)`. O ano é apagado em toda devolução.

`dashboard()` e `insights()` filtram os lidos com `status === "lido"`. A meta é `read.filter((b) => b.yearRead === Y)`. Por isso o livro sai da meta já no empréstimo, não só na devolução.

## Goals / Non-Goals

**Goals:**

- Devolver sem perder o ano de leitura e voltar ao status `lido` quando houver ano.
- Manter o livro lido na meta e nos números de lidos durante o empréstimo.
- Manter a paridade com o standalone nos testes de oráculo (a referência não tem emprestado com ano de leitura).

**Non-Goals:**

- Guardar o status anterior ao empréstimo numa coluna nova. Um livro em releitura (`lendo` com `yearRead` de uma leitura anterior), se emprestado, volta como `lido`, não como `lendo`. Isso é raro e não justifica uma migration.
- Recuperar o ano dos livros já devolvidos. Não existe histórico para isso.
- Mudar o filtro de status da Estante. O filtro "Lidos" continua por status, e o clique numa coluna de "Lidos por ano" em Dados continua abrindo a Estante com `status=lido`. Enquanto um livro lido estiver emprestado, a coluna conta um livro a mais do que a Estante mostra.
- Contar como lidos os livros `doado`, `abandonado` ou `lendo` que tenham ano de leitura.

## Decisions

### 1. Status de devolução derivado do `yearRead`

`returnStatus(book)` devolve `lido` se `book.yearRead` estiver preenchido e `nao-lido` se não estiver. `returnBook(book)` grava só `{ status, borrower: null }`. O `yearRead` nunca entra no patch, então não há caminho de devolução que o apague. O `lentAt` já é limpo pelo servidor ao sair de `emprestado` (BP-06).

- *Alternativa: coluna `status_before_lend`.* Seria exata também para `lendo`, `abandonado` e `doado`, mas exige migration, backfill sem dado de origem e ajustes no backup, no lote e no merge da planilha. Foi descartada pelo custo e porque o caso comum, um livro lido emprestado, já fica certo com o `yearRead`.

### 2. `isRead`: lido ou emprestado com ano de leitura

`isRead(book) = status === "lido" || (status === "emprestado" && !!yearRead)`. É a mesma regra da devolução vista ao contrário: um emprestado com ano de leitura é um livro que volta como `lido`. `dashboard()` e `insights()` trocam o filtro de `read` por `isRead`. Com isso, a meta, "Lidos no ano", os KPIs, o escopo "Apenas lidos", o termômetro, os calhamaços, "Lidos por ano" e a lista de atribuir ano passam a contar o livro emprestado.

- *Alternativa: contar qualquer livro com `yearRead`.* Levaria para os lidos `doado`, `abandonado` e `lendo` com ano, e mudaria números que hoje batem com o standalone. Foi descartada.
- *Alternativa: mudar só a meta.* Deixaria o Painel e Dados com números diferentes para o mesmo livro (conta na meta, mas não em Lidos). Foi descartada.

### 3. "Desfazer leitura" num livro emprestado só limpa o ano

Como agora um emprestado aparece em "Lidos no ano", o ✕ "Desfazer leitura" pode ser usado nele. O `undoRead` atual gravaria `status: "nao-lido"` e encerraria o empréstimo sem pedir. Para um livro `emprestado`, `undoRead` grava só `yearRead: null`. O livro sai da meta e continua com quem pegou.

## Risks / Trade-offs

- [Divergência entre a coluna de "Lidos por ano" e a Estante filtrada enquanto um lido está emprestado] → Aceito e registrado em Non-Goals. O livro aparece na Estante pelo filtro "Emprestados".
- [Livro emprestado sem ano de leitura que já tinha sido lido] → Volta como `nao-lido`, que é o que acontece hoje. O ano pode ser atribuído em Dados.
