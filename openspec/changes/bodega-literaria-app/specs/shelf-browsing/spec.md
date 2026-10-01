## ADDED Requirements

### Requirement: Visualização em capas e em lista
A Estante SHALL alternar entre "Capas" (grid `repeat(auto-fill, minmax(160px, 1fr))` com cards de capa 2:3) e "Lista" (tabela com #, capa, título, autor, editora, gênero/país, ano, aquisição, status e ações), conforme `Acervo.dc.html`.

#### Scenario: Trocar para lista
- **WHEN** o usuário seleciona "Lista" no controle segmentado
- **THEN** os mesmos livros filtrados aparecem em formato de tabela, com rolagem horizontal abaixo de 1120px

### Requirement: Busca global
O campo de busca do header SHALL filtrar por título, autor, editora, nacionalidade, gênero, nome de quem pegou emprestado e anotações, sem diferenciar acentos nem maiúsculas. Digitar na busca MUST levar o usuário à Estante.

#### Scenario: Busca sem acento
- **WHEN** o usuário digita "sertao" na busca
- **THEN** "Grande sertão: veredas" aparece entre os resultados

### Requirement: Filtro por status e favoritos
A Estante SHALL exibir chips "Todos", um por status (com ponto colorido e contagem) e "♥ Favoritos". Exatamente um chip MUST estar ativo.

#### Scenario: Filtrar lidos
- **WHEN** o usuário clica no chip "Lidos"
- **THEN** só livros com status `lido` aparecem e o contador do topo mostra "N de M livros"

### Requirement: Facetas
O sistema SHALL suportar uma faceta ativa por vez, aplicada a partir do clique em autor, gênero, nacionalidade, editora, ano lido ou status nos gráficos. A faceta ativa MUST aparecer como uma pílula de acento com ✕ para removê-la.

#### Scenario: Filtrar por autor
- **WHEN** o usuário clica no nome do autor num card
- **THEN** a Estante mostra só os livros desse autor, com a pílula "Autor(a): <nome> ✕"

### Requirement: Ordenação
O menu "Ordenar" SHALL oferecer os grupos e opções do standalone: Ordem da planilha (1 → fim, fim → 1), Título (A–Z, Z–A), Autor(a) (A–Z), Editora (A–Z), Lançamento (novos, antigos), Aquisição (recentes) e Páginas (maiores). A comparação de texto MUST usar a collation pt-BR sem diferenciar acentos.

#### Scenario: Escolher ordenação
- **WHEN** o usuário escolhe "Título · Z–A"
- **THEN** a lista é reordenada, o menu fecha e o botão mostra "Título · Z–A"

#### Scenario: Fechar o menu
- **WHEN** o menu está aberto e o usuário clica fora ou pressiona Esc
- **THEN** o menu fecha com a seta voltando à posição original

### Requirement: Estado da Estante na URL
Busca, chip de status, faceta, ordenação e modo de visualização SHALL ficar refletidos nos parâmetros de URL da Estante, para que recarregar ou compartilhar o link preserve a vista.

#### Scenario: Recarregar com filtro
- **WHEN** o usuário recarrega a página com o chip "Lendo" e a ordenação "Páginas" ativos
- **THEN** a Estante reabre com os mesmos filtros

### Requirement: Carregamento incremental
A Estante SHALL renderizar 18 livros por vez e carregar mais 18 quando o sentinela entrar a 300px da viewport, mostrando "Carregando mais livros" com os três pontos animados. Ao final, se houver mais de 18 livros, MUST mostrar "Fim da estante · N livros".

#### Scenario: Rolar até o fim
- **WHEN** o usuário rola até o fim de uma lista com 40 livros
- **THEN** os livros aparecem em blocos de 18 e, ao final, a divisória "Fim da estante · 40 livros" é exibida

### Requirement: Ações de hover na capa
No modo capas, o hover SHALL revelar as ações ♥/♡ (favorito), ✓ (alternar lido/não lido) e ✎ (editar), entrando da direita com transição de opacidade e deslocamento.

#### Scenario: Marcar lido pela capa
- **WHEN** o usuário passa o mouse numa capa não lida e clica em ✓
- **THEN** o livro passa para `lido` (preenchendo o ano lido, se vazio)

### Requirement: Estados vazios da Estante
A Estante SHALL distinguir acervo vazio de busca sem resultado, conforme a versão final de `Acervo.dc.html`.

#### Scenario: Acervo vazio
- **WHEN** o usuário não tem nenhum livro
- **THEN** aparece "Sua estante está vazia" com as ações "+ Registrar livro", "Sincronizar planilha" e "Restaurar backup"

#### Scenario: Nada encontrado
- **WHEN** há livros, mas nenhum corresponde à busca e aos filtros
- **THEN** aparece "Nenhum livro encontrado · Nenhum livro corresponde à busca e aos filtros atuais." com o botão "Limpar filtros", que zera busca, status e faceta
