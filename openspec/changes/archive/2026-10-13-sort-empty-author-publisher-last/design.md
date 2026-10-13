## Context

`sortBooks` em `lib/domain/shelf.ts` ordena com um comparador por `SortKey` (`COMPARATORS`). Os de texto usam `cmp` de `lib/domain/text.ts`: `(a || "").localeCompare(b || "", "pt-BR", { sensitivity: "base" })`.

- `autor: cmp(a.author, b.author)`: um `author` nulo vira `""`, que vem antes de qualquer texto.
- `editora: cmp(a.publisher || "~", b.publisher || "~")`: a ideia era jogar os vazios para o fim, mas no ICU, em pt-BR, `~` é pontuação e vem antes das letras.

Os outros comparadores já põem os vazios no fim com sentinelas numéricas (`1e9`, `-1e4`, `0`) ou com `""` numa comparação decrescente (`recentes`).

O código é porte do standalone (`Acervo.dc.html`), e `shelf.test.ts` tem duas proteções:

- um caso em `sortBooks` que espera explicitamente o livro sem editora **primeiro** ("Fiel ao standalone");
- o teste "estante × standalone", que compara todas as ordenações com o oráculo nos 30 livros da fixture de referência. Nenhum deles tem autor ou editora vazios.

## Goals / Non-Goals

**Goals:**

- Vazios no fim em "Autor(a) · A–Z" e "Editora · A–Z".
- Manter a ordem pt-BR, sem acento nem caixa, entre os preenchidos.

**Non-Goals:**

- Mudar `cmp` em `text.ts`. Outros pontos usam a função (`insights.ts`, `titulo`) e lá não há vazios para tratar.
- Desempate secundário (por título, por exemplo) entre livros da mesma editora ou do mesmo autor. Hoje vale a ordem de entrada, e isso continua.
- Mexer nas outras ordenações.

## Decisions

### 1. Comparador local `cmpEmptyLast` em `shelf.ts`

Um helper no próprio `shelf.ts`:

```ts
/** Como `cmp`, mas valores vazios (nulo, "" ou só espaços) vão para o fim. */
function cmpEmptyLast(a: string | null, b: string | null): number {
  const ea = !a?.trim();
  const eb = !b?.trim();
  return ea || eb ? Number(ea) - Number(eb) : cmp(a, b);
}
```

`autor` e `editora` passam a usar `cmpEmptyLast(a.author, b.author)` e `cmpEmptyLast(a.publisher, b.publisher)`. Dois vazios dão `0`, e o sort estável do JS mantém a ordem de entrada entre eles.

- *Alternativa: trocar o sentinela por um caractere que o ICU ponha depois das letras, como `"￿"`.* Depende do comportamento do ICU com um caractere sem atribuição e não resolve o `autor`, que nem tem sentinela. A comparação explícita não depende do collator.
- *Alternativa: pôr o tratamento de vazios dentro de `cmp`.* Mudaria `insights.ts` e `titulo` sem necessidade, e `cmp` deixaria de ser a comparação de texto pura.

### 2. Só espaços conta como vazio

O formulário e a importação deveriam salvar os campos já aparados, mas a planilha e o backup são fontes externas. Tratar `"  "` como vazio custa só um `trim()` e evita um livro "sem editora" aparecer no começo.

### 3. Divergência consciente do standalone

O caso de `sortBooks` que dizia "fiel ao standalone" passa a esperar o livro sem editora no fim, com um comentário dizendo que aqui o app diverge do standalone de propósito (BP-12). O teste do oráculo continua igual, porque a fixture não tem vazios.

## Risks / Trade-offs

- [Um dia a fixture de referência ganha um livro sem autor ou sem editora e o teste do oráculo quebra em `autor` e `editora`] → O comentário no teste de `sortBooks` registra a divergência. Se isso acontecer, o oráculo precisa pular esses casos ou ajustar o esperado.
