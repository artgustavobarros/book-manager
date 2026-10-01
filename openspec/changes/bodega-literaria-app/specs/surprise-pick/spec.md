## ADDED Requirements

### Requirement: Sortear livro não lido
"Me surpreenda" SHALL sortear um livro com status `nao-lido`, evitando repetir o último sorteado quando houver mais de uma opção, e mostrar a capa, o título, o autor, os metadados e "Sorteado entre N livros não lidos".

#### Scenario: Sortear outro
- **WHEN** o usuário clica em "🎲 Sortear outro livro" com 2 ou mais candidatos
- **THEN** aparece um livro diferente do anterior

### Requirement: Filtro por gênero
O modal SHALL oferecer "Sortear entre", com "Todos os gêneros (N)" e um item por gênero com livros não lidos, ordenados pela contagem.

#### Scenario: Gênero sem candidatos
- **WHEN** a seleção não tem nenhum livro não lido
- **THEN** aparece "Não há livros “Não lido” nesta seleção."

### Requirement: Ações do sorteio
O modal SHALL oferecer "📖 Começar a ler agora", que muda o status para `lendo`, fecha o modal e mostra o toast "📖 Boa leitura: <título>", e "Editar ficha", que abre a edição do livro sorteado.

#### Scenario: Começar a ler
- **WHEN** o usuário clica em "📖 Começar a ler agora"
- **THEN** o livro passa a aparecer em "Lendo agora" no Painel

### Requirement: Botão desabilitado sem candidatos
O botão "Me surpreenda" do header SHALL ficar desabilitado, com o título "Nenhum livro não lido para sortear", quando não houver livros `nao-lido`.

#### Scenario: Conta nova
- **WHEN** o usuário não tem livros não lidos
- **THEN** o botão aparece com o estilo de desabilitado e não abre o modal
