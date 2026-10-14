## MODIFIED Requirements

### Requirement: Sortear livro não lido
"Me surpreenda" SHALL sortear um livro com status `nao-lido`, evitando repetir o último sorteado quando houver mais de uma opção, e mostrar a capa, o título, o autor, os metadados e "Sorteado entre N livros não lidos". O botão "Sortear outro livro" MUST usar o ícone `Shuffle` do `lucide-react` (decorativo) no lugar do emoji 🎲.

#### Scenario: Sortear outro
- **WHEN** o usuário clica em "Sortear outro livro" com 2 ou mais candidatos
- **THEN** aparece um livro diferente do anterior
