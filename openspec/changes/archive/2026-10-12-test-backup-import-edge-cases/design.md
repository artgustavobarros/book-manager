## Context

`POST /api/books/import` (`app/api/books/import/route.ts`) valida só a forma com `importSchema` (array com no máximo 20000 itens), converte com `fromBackup` → `legacyToFields` e grava com `replaceBooks`, que faz `DELETE ... WHERE user_id = ?` e os INSERTs numa transação. Desde o BP-01, `fromBackup` lança `InvalidBackupError` quando não sobra nenhum livro com título, e a rota responde 400.

`legacyToFields` converte os inteiros com `toPositiveInt`, que aceita qualquer inteiro positivo. Como `orderNo`, `yearPublished`, `pages` e `yearRead` são colunas `integer` (máx. 2.147.483.647), `pages: "99999999999"` faz o INSERT falhar. A transação desfaz o `DELETE`, então nada se perde, mas o usuário recebe 500 "Erro inesperado." e não consegue restaurar o resto do backup. `bookFieldsSchema` já define os limites certos (1.000.000 para o nº, 100.000 para páginas e 9999 para os anos), mas o import não passa por ele.

O usuário decidiu seguir a sugestão do BP-11 e descartar os valores fora da faixa, em vez de rejeitar o backup com 400.

## Goals / Non-Goals

**Goals:**
- Cobrir com testes de integração as bordas do import: isolamento, reimport, numeração, tamanho máximo, autenticação e números fora da faixa.
- Fazer o import aceitar backups com números absurdos, descartando só o campo.
- Ter uma única fonte para os limites numéricos do livro.

**Non-Goals:**
- `coverUrl` (esquema `http(s)` e tamanho) e o tamanho máximo dos textos no backup. Ficam para o BP-11.
- Os limites no merge da planilha (`lib/domain/sheet.ts`, `legacyValue`). Também ficam para o BP-11/BP-13.
- Rejeitar backups em que muitos itens foram descartados.
- Testar o limite exato de 20000 aceito. Inserir 20000 linhas deixaria a suíte lenta, e o `max` do Zod já é coberto pelo caso de 20001.

## Decisions

**1. Descartar (`null`) em vez de rejeitar.** É a correção proposta no BP-11 e a escolha do usuário. Um backup antigo com um campo corrompido continua restaurável, e o comportamento fica coerente com os outros conversores de `backup.ts` (`toIsoDate`, `toGender`), que também viram `null` quando o valor é inválido. A alternativa, 400 para o backup inteiro, protegeria mais contra arquivos que não são backups, mas esse caso já é tratado pelo filtro de título.

**2. Constantes de limite no domínio.** Criar `BOOK_INT_MAX` em `lib/domain/types.ts` (`{ orderNo: 1_000_000, yearPublished: 9999, pages: 100_000, yearRead: 9999 }`) e usá-las em `bookFieldsSchema` e em `legacyToFields`. A validação já importa de `lib/domain/types`, e o domínio não deve depender de `lib/validation`. A alternativa, passar cada item por `bookFieldsSchema.safeParse`, rejeitaria o livro inteiro em vez de descartar só o campo, e misturaria as mensagens do formulário com o import.

**3. Helper com teto.** `toPositiveInt(v, max?)` ganha um teto opcional: acima dele, devolve `null`. Sem `max`, o comportamento não muda, o que preserva o uso em `sheet.ts`. `orderNo` descartado volta a ser atribuído por `withOrders`, como qualquer nº ausente.

**4. Onde testar.** Os casos de rota (isolamento, 401, >20000, reimport, numeração e número fora da faixa ponta a ponta) ficam em `tests/integration/api.test.ts`, no bloco `importar backup`. O teto do helper e o descarte em `legacyToFields` ficam em `lib/domain/backup.test.ts`. Para o isolamento, bia cria livros pela própria API antes do import de ana, e o teste compara a lista de bia antes e depois.

**5. Prova de detecção.** Como no BP-02, tirar temporariamente o filtro `eq(books.userId, userId)` do `DELETE` de `replaceBooks` e confirmar que o teste de isolamento falha. Depois, reverter.

## Risks / Trade-offs

- [O descarte é silencioso: o usuário não sabe que um campo foi zerado] → Aceito. É o mesmo tratamento dado a datas e gêneros inválidos, e o caso é raro (arquivo corrompido ou editado à mão). Avisar sobre isso fica fora do escopo.
- [Os testes de integração compartilham ana e bia entre os blocos, e a ordem importa] → Cada teste novo mede o estado antes e depois, em vez de assumir contagens absolutas herdadas de outros blocos. Onde a contagem importa, o teste faz um import de referência antes.
- [O payload de 20001 itens deixa o teste mais lento] → Itens mínimos (`{ title: "x" }`). O Zod rejeita antes de qualquer acesso ao banco.
