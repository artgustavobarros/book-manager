## ADDED Requirements

### Requirement: Edições seguidas no mesmo livro
Quando o usuário faz várias edições no mesmo livro antes de a API responder, a resposta de uma edição MUST NOT desfazer na tela uma edição posterior ainda pendente nesse livro. As edições de um mesmo livro MUST chegar ao servidor na ordem em que foram feitas, cada uma depois de a anterior terminar, com sucesso ou com erro. Assim, o valor final no banco é o da última edição que deu certo. Edições em livros diferentes MUST continuar independentes, sem esperar umas pelas outras. Campos que o servidor devolve e que nenhuma edição pendente mudou MUST passar a valer na tela assim que a resposta chega.

#### Scenario: Favoritar duas vezes seguidas
- **WHEN** o usuário favorita o livro A e, antes da resposta, clica de novo em favoritar
- **THEN** A aparece sem favorito durante todo o tempo depois do segundo clique, inclusive quando chega a resposta do primeiro, e ao recarregar a página A continua sem favorito

#### Scenario: Status e "Começar a ler" em sequência
- **WHEN** o usuário marca o livro A como "lido" e, antes da resposta, clica em "Começar a ler"
- **THEN** A aparece como "lendo" a partir do clique, a resposta da primeira edição não o volta para "lido", e o servidor termina com A em "lendo"

#### Scenario: Ordem de chegada ao servidor
- **WHEN** o usuário faz duas edições no livro A antes da resposta da primeira
- **THEN** o PATCH da segunda só é enviado depois que o da primeira termina

#### Scenario: Primeira edição falha
- **WHEN** o usuário faz duas edições no livro A, a primeira falha e a segunda dá certo
- **THEN** o toast mostra o erro da primeira, a segunda é enviada mesmo assim, e A termina com o valor da segunda

#### Scenario: Livros diferentes não esperam
- **WHEN** o PATCH do livro A está pendente e o usuário muda o status do livro B
- **THEN** o PATCH de B é enviado na hora, sem esperar o de A
