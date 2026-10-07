## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Dica sem gêneros cadastrados
Quando nenhum livro não lido tiver gênero preenchido, o combobox SHALL mostrar apenas "Todos os gêneros (N)" e, abaixo dele, a dica "Cadastre o gênero na ficha dos livros para sortear por gênero."

#### Scenario: Acervo sem gêneros
- **WHEN** há livros não lidos, mas nenhum deles tem gênero
- **THEN** o combobox tem só a opção "Todos os gêneros (N)" e a dica aparece no modal
