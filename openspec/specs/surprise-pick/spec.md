# surprise-pick Specification

## Purpose
TBD - created by archiving change bodega-literaria-app. Update Purpose after archive.
## Requirements
### Requirement: Sortear livro não lido
"Me surpreenda" SHALL sortear um livro com status `nao-lido`, evitando repetir o último sorteado quando houver mais de uma opção, e mostrar a capa, o título, o autor, os metadados e "Sorteado entre N livros não lidos". O botão "Sortear outro livro" MUST usar o ícone `Shuffle` do `lucide-react` (decorativo) no lugar do emoji 🎲.

#### Scenario: Sortear outro
- **WHEN** o usuário clica em "Sortear outro livro" com 2 ou mais candidatos
- **THEN** aparece um livro diferente do anterior

### Requirement: Filtro por gênero
O modal SHALL oferecer "Sortear entre" como um combobox pesquisável, com "Todos os gêneros (N)" e um item por gênero com livros não lidos, ordenados pela contagem. O campo MUST mostrar o rótulo da opção selecionada; clicar no campo ou no botão de seta MUST abrir a lista, e digitar no próprio campo MUST reduzir as opções. A busca MUST ignorar maiúsculas e acentos, e escolher uma opção MUST fechar a lista, aplicar o filtro e sortear um novo livro dentro dele. O combobox MUST ser operável pelo teclado (setas, Enter para escolher, Esc para fechar a lista sem fechar o modal).

#### Scenario: Escolher um gênero
- **WHEN** o acervo tem livros não lidos de "Romance" e "Poesia" e o usuário abre "Sortear entre" e clica em "Romance (N)"
- **THEN** o campo passa a mostrar "Romance (N)" e o livro sorteado é um livro não lido de "Romance"

#### Scenario: Digitar para filtrar
- **WHEN** o usuário digita "ficcao" no campo "Sortear entre"
- **THEN** a lista mostra só as opções cujo nome contém "Ficção" (ex.: "Ficção científica"), sem diferenciar acentos

#### Scenario: Sair sem escolher
- **WHEN** o usuário digita um texto e sai do campo sem escolher uma opção
- **THEN** o campo volta a mostrar o rótulo da opção que já estava selecionada e o filtro do sorteio não muda

#### Scenario: Busca sem resultado
- **WHEN** o texto digitado não corresponde a nenhum gênero
- **THEN** a lista mostra "Nenhum gênero encontrado."

#### Scenario: Esc fecha só a lista
- **WHEN** a lista de gêneros está aberta e o usuário pressiona Esc
- **THEN** a lista fecha, o modal continua aberto e o foco fica no campo "Sortear entre"

#### Scenario: Gênero sem candidatos
- **WHEN** a seleção não tem nenhum livro não lido
- **THEN** aparece "Não há livros “Não lido” nesta seleção."

### Requirement: Ações do sorteio
O modal SHALL oferecer "📖 Começar a ler agora (mudar para “Lendo”)", que muda o status para `lendo`, fecha o modal e mostra o toast de sucesso "Boa leitura: <título>", sem emoji, e "Editar ficha", que abre a edição do livro sorteado.

#### Scenario: Começar a ler
- **WHEN** o usuário clica em "📖 Começar a ler agora (mudar para “Lendo”)"
- **THEN** o livro passa a aparecer em "Lendo agora" no Painel e aparece o toast "Boa leitura: <título>"

### Requirement: Botão desabilitado sem candidatos
O botão "Me surpreenda" do header SHALL ficar desabilitado, com o título "Nenhum livro não lido para sortear", quando não houver livros `nao-lido`.

#### Scenario: Conta nova
- **WHEN** o usuário não tem livros não lidos
- **THEN** o botão aparece com o estilo de desabilitado e não abre o modal

### Requirement: Layout compacto no mobile
Até 640px de largura, o modal "Me surpreenda" SHALL esconder a coluna da capa e mostrar o livro sorteado numa linha compacta: capa de 84px (2:3) à esquerda e, à direita, a contagem de candidatos, o título, o autor e os metadados. O conteúdo MUST usar padding de 20px.

#### Scenario: Sorteio no mobile
- **WHEN** o modal abre a 390px
- **THEN** não há coluna lateral com espaço vazio, e a capa de 84px aparece ao lado do título do livro sorteado

### Requirement: Dica sem gêneros cadastrados
Quando nenhum livro não lido tiver gênero preenchido, o combobox SHALL mostrar apenas "Todos os gêneros (N)" e, abaixo dele, a dica "Cadastre o gênero na ficha dos livros para sortear por gênero."

#### Scenario: Acervo sem gêneros
- **WHEN** há livros não lidos, mas nenhum deles tem gênero
- **THEN** o combobox tem só a opção "Todos os gêneros (N)" e a dica aparece no modal

