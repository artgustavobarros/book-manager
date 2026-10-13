## MODIFIED Requirements

### Requirement: Ordenação
O menu "Ordenar" SHALL oferecer os grupos e opções do standalone: Ordem da planilha (1 → fim, fim → 1), Título (A–Z, Z–A), Autor(a) (A–Z), Editora (A–Z), Lançamento (novos, antigos), Aquisição (recentes) e Páginas (maiores). A comparação de texto MUST usar a collation pt-BR sem diferenciar acentos. Em "Autor(a) · A–Z" e "Editora · A–Z", livros sem o campo (nulo, vazio ou só espaços) MUST ficar no fim da lista, depois de todos os que têm o campo preenchido, mantendo entre si a ordem anterior.

#### Scenario: Escolher ordenação
- **WHEN** o usuário escolhe "Título · Z–A"
- **THEN** a lista é reordenada, o menu fecha e o botão mostra "Título · Z–A"

#### Scenario: Fechar o menu
- **WHEN** o menu está aberto e o usuário clica fora ou pressiona Esc
- **THEN** o menu fecha com a seta voltando à posição original

#### Scenario: Livros sem editora ou sem autor no fim
- **WHEN** o acervo tem livros das editoras "Zahar" e "Abril" e um livro sem editora, e o usuário escolhe "Editora · A–Z"
- **THEN** a lista mostra Abril, Zahar e por último o livro sem editora; em "Autor(a) · A–Z", o livro sem autor também fica por último
