# shelf-browsing Specification

## Purpose
TBD - created by archiving change bodega-literaria-app. Update Purpose after archive.
## Requirements
### Requirement: Visualização em capas e em lista
A Estante SHALL alternar entre "Capas" (grid `repeat(auto-fill, minmax(160px, 1fr))` com cards de capa 2:3; até 640px de largura, duas colunas) e "Lista" com os mesmos livros filtrados. Acima de 640px, "Lista" SHALL mostrar a tabela com #, capa, título, autor, editora, gênero/país, ano, aquisição, status e ações; quando a tabela exceder a largura disponível, a interface MUST indicar que há mais colunas e permitir alcançá-las por toque e teclado. Até 640px, "Lista" SHALL usar linhas responsivas com título, autor, status e ações principais visíveis sem rolagem lateral; a ficha MUST dar acesso aos demais dados. A capa MUST NOT ter selo de status sobreposto; o status aparece no seletor abaixo do card.

#### Scenario: Trocar para lista no desktop
- **WHEN** o usuário seleciona "Lista" acima de 1120px
- **THEN** os mesmos livros filtrados aparecem na tabela com todas as colunas

#### Scenario: Lista em largura intermediária
- **WHEN** o usuário abre "Lista" a 768px
- **THEN** a área da tabela indica conteúdo à direita, recebe foco pelo teclado e permite acessar as colunas e ações ocultas

#### Scenario: Lista no mobile
- **WHEN** a Estante em "Lista" é aberta a 390px
- **THEN** cada livro mostra título, autor, status e ações principais sem rolagem lateral, e o título abre a ficha completa

#### Scenario: Capas no mobile
- **WHEN** a Estante em "Capas" é aberta a 390px
- **THEN** dois cards aparecem lado a lado, e o nome do autor no topo da capa gerada não é coberto por nenhum selo

### Requirement: Busca global
O campo de busca do header SHALL filtrar por título, autor, editora, nacionalidade, gênero, nome de quem pegou emprestado e anotações, sem diferenciar acentos nem maiúsculas. Digitar na busca MUST levar o usuário à Estante. Quando a digitação começa fora da Estante, o campo MUST manter todos os caracteres digitados enquanto a navegação acontece, a Estante MUST abrir filtrada pelo texto completo e a ida à Estante MUST criar uma única entrada no histórico do navegador.

#### Scenario: Busca sem acento
- **WHEN** o usuário digita "sertao" na busca
- **THEN** "Grande sertão: veredas" aparece entre os resultados

#### Scenario: Digitar rápido fora da Estante
- **WHEN** no Painel o usuário digita "kindred" na busca do header sem pausa entre as teclas
- **THEN** a Estante abre com `q=kindred` na URL, o campo mostra "kindred" e só o livro "Kindred" aparece

#### Scenario: Voltar depois de buscar a partir de outra página
- **WHEN** o usuário digita "kindred" na busca a partir do Painel e, já na Estante, usa o "voltar" do navegador
- **THEN** o navegador volta direto ao Painel

### Requirement: Filtro por status e favoritos
A Estante SHALL exibir chips "Todos", um por status (com ponto colorido e contagem) e "♥ Favoritos". Exatamente um chip MUST estar ativo. Acima de 640px de largura, os chips SHALL quebrar linha quando não couberem e o topo SHALL mostrar a contagem "N livros" ou "N de M livros". Até 640px, os chips MUST ficar numa única faixa com rolagem horizontal (por toque, arrastando com o botão esquerdo do mouse e pelo teclado, ao focar cada chip), sem quebrar linha e sem provocar rolagem horizontal da página, e a contagem do topo MUST NOT aparecer.

#### Scenario: Filtrar lidos
- **WHEN** acima de 640px o usuário clica no chip "Lidos"
- **THEN** só livros com status `lido` aparecem e o contador do topo mostra "N de M livros"

#### Scenario: Chips em faixa no celular
- **WHEN** a Estante é aberta a 390px com chips que somam mais largura que a tela
- **THEN** os chips ficam numa só linha, a faixa rola na horizontal até o último chip, a página não rola na horizontal e não há contagem "N livros" acima de "Estante"

#### Scenario: Arrastar os chips com o mouse
- **WHEN** a 390px o usuário pressiona o botão esquerdo do mouse sobre os chips e arrasta para a esquerda
- **THEN** a faixa rola junto com o mouse, e soltar o botão depois do arraste não aciona o chip sob o cursor; um clique sem arraste continua filtrando

### Requirement: Facetas
O sistema SHALL suportar uma faceta ativa por vez, aplicada a partir do clique em autor, gênero, nacionalidade, editora, ano lido ou status nos gráficos. A faceta ativa MUST aparecer como uma pílula de acento com ✕ para removê-la.

#### Scenario: Filtrar por autor
- **WHEN** o usuário clica no nome do autor num card
- **THEN** a Estante mostra só os livros desse autor, com a pílula "Autor(a): <nome> ✕"

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

### Requirement: Estado da Estante na URL
Busca, chip de status, faceta, ordenação, modo de visualização e página atual SHALL ficar refletidos nos parâmetros de URL da Estante, para que recarregar ou compartilhar o link preserve a vista. Alterar busca, status, faceta ou ordem MUST voltar à primeira página válida; se o total diminuir, a página MUST ser ajustada para a última válida.

#### Scenario: Recarregar com filtro
- **WHEN** o usuário recarrega a página com o chip "Lendo", a ordenação "Páginas" e a página 2 ativos
- **THEN** a Estante reabre com os mesmos filtros e a mesma página

#### Scenario: Filtro reduz o total
- **WHEN** o usuário está na página 20 e aplica um filtro que só tem 3 livros
- **THEN** a Estante mostra a página 1 com os 3 livros, sem estado vazio falso

### Requirement: Carregamento incremental
A Estante SHALL apresentar os resultados em páginas explícitas de até 18 livros, sem carregar automaticamente todos os blocos ao rolar. Os controles SHALL informar a faixa atual e o total, permitir avançar/voltar e ir diretamente à primeira e à última página. A página atual MUST ser alcançável e anunciada pelo teclado/leitor de tela. A mudança de página MUST posicionar o início dos resultados na área visível, sem perder filtros, ordem ou vista.

#### Scenario: Ir ao fim do acervo grande
- **WHEN** o usuário abre um acervo de 500 livros e ativa "Última página"
- **THEN** vê os livros finais sem ter de percorrer as 27 páginas anteriores, com a indicação "Página 28 de 28"

#### Scenario: Voltar pelo histórico
- **WHEN** o usuário vai da página 1 para a 2 e depois usa Voltar no navegador
- **THEN** os livros e o indicador da página 1 reaparecem

### Requirement: Ações de hover na capa
No modo capas, acima de 640px de largura, o hover SHALL revelar as ações favorito (ícone de coração), alternar lido/não lido (ícone de check) e editar (ícone de lápis), entrando da direita com transição de opacidade e deslocamento. Os ícones MUST vir do `lucide-react`. Uma ação ativa (livro favorito, livro lido) MUST usar a cor de acento do projeto (`--acc` de fundo e `--onacc` no ícone); uma ação inativa MUST usar o fundo de cartão com a tinta do tema. Nenhum estado MUST usar preto ou branco fixos. Até 640px, as três ações MUST ficar sempre visíveis, e o ♥ decorativo de favorito MUST ficar oculto.

#### Scenario: Marcar lido pela capa
- **WHEN** o usuário passa o mouse numa capa não lida e clica no check
- **THEN** o livro passa para `lido` (preenchendo o ano lido, se vazio) e o botão de check passa a usar a cor de acento

#### Scenario: Favorito ativo na cor do projeto
- **WHEN** o usuário passa o mouse sobre a capa de um livro favorito, no tema claro ou escuro
- **THEN** o botão de coração aparece preenchido na cor de acento do tema, e o botão de editar aparece com fundo de cartão

#### Scenario: Ações no toque
- **WHEN** a 390px o usuário toca no coração vazio de uma capa
- **THEN** o livro vira favorito sem abrir a ficha

### Requirement: Estados vazios da Estante
A Estante SHALL distinguir acervo vazio de busca sem resultado, conforme a versão final de `Acervo.dc.html`. Com acervo vazio, SHALL esconder chips com contagem zero, ordenação e troca de visualização; as ações de primeiro registro, planilha e backup MUST ser o foco principal. Com busca sem resultado em acervo existente, o usuário MUST poder limpar os filtros.

#### Scenario: Acervo vazio
- **WHEN** o usuário não tem nenhum livro
- **THEN** aparece "Sua estante está vazia" com as ações "+ Registrar livro", "Sincronizar planilha" e "Restaurar backup", sem filtros, ordenação ou seletor Capas/Lista

#### Scenario: Nada encontrado
- **WHEN** há livros, mas nenhum corresponde à busca e aos filtros
- **THEN** aparece "Nenhum livro encontrado · Nenhum livro corresponde à busca e aos filtros atuais." com o botão "Limpar filtros", que zera busca, status e faceta e volta à primeira página

### Requirement: Capas automáticas desde o primeiro render
A busca automática de capas SHALL considerar todos os cards de capa e linhas da lista visíveis (ou a até 200px da viewport), inclusive os renderizados na primeira carga da Estante, e não só os que montam depois.

#### Scenario: Primeira carga
- **WHEN** a Estante abre com livros sem capa e sem `coverCheckedAt` visíveis na tela
- **THEN** a busca de capa é disparada para esses livros sem que o usuário precise rolar

### Requirement: Ações rápidas de status na Estante
A Estante SHALL permitir alternar status diretamente nos cards de visualização em capas e nas linhas da lista sem exigir a abertura da ficha modal. No card, a troca MUST ser feita pelo seletor de status, sem botão de ação rápida ao lado. Na linha da lista, além do seletor, MUST existir o botão de ação rápida (começar a ler, concluir leitura ou marcar como não lido). O acionamento MUST atualizar o estado otimista imediatamente, salvar no servidor e exibir feedback visual (toast ou micro-animação). Caso a requisição falhe, o status anterior MUST ser restaurado e uma notificação de erro informada ao usuário.

#### Scenario: Alternar status com um toque na linha
- **WHEN** o usuário clica na ação rápida de status de um livro com status "quero-ler" na lista
- **THEN** o status é atualizado imediatamente para "lendo", refletindo no ponto colorido e contadores sem recarregar a página

#### Scenario: Reverter leitura concluída na linha
- **WHEN** o usuário clica na ação de status em um livro com status "lido" na lista
- **THEN** o livro volta para o status anterior ou "quero-ler" e o contador de lidos é decrementado imediatamente

#### Scenario: Trocar status no card
- **WHEN** o usuário escolhe "Lendo" no seletor de status de um card
- **THEN** o status é atualizado imediatamente, sem abrir a ficha, e o card não mostra outro botão para a mesma ação

### Requirement: Filtro rápido e badge informativa de empréstimos na Estante
A Estante SHALL disponibilizar acesso direto ou chip de filtro para listar apenas os livros com status "emprestado". O badge de empréstimo nos cards e linhas MUST ser clicável para exibir os dados do empréstimo ou acionar a devolução. O tempo exibido no badge ("hoje", "há N dias", "há N meses") MUST ser contado a partir do início do empréstimo (`lentAt`), em dias de calendário no fuso do usuário, com a mesma regra do detalhamento de empréstimos do Painel.

#### Scenario: Filtrar por livros emprestados
- **WHEN** o usuário seleciona o filtro de empréstimos na Estante
- **THEN** apenas os livros atualmente emprestados são exibidos na lista/capas com a pessoa que pegou em destaque

#### Scenario: Favoritar não altera o tempo do badge
- **WHEN** o usuário favorita na Estante um livro emprestado há 5 dias
- **THEN** o badge do card e da linha continua "Com <nome> · há 5 dias"

### Requirement: Áreas de toque confortáveis na Estante mobile
Todos os controles interativos na Estante (botões de ação nos cards, seletor de status, botões de paginação e gatilho de ordenação) SHALL possuir uma área mínima de toque de 44×44px em telas de até 640px de largura, prevenindo toques errôneos em elementos vizinhos.

#### Scenario: Toque no seletor de ordenação no mobile
- **WHEN** o usuário em tela de 390px toca no botão de ordenação ou de paginação
- **THEN** o alvo de toque abrange pelo menos 44px de altura e largura, abrindo o menu sem acionar links adjacentes

### Requirement: Capas em duas colunas no celular
O sistema SHALL organizar os livros do modo Capas da estante em exatamente duas colunas de mesma largura em janelas de até 640 px, inclusive a 320 px. Cards, textos e controles MUST caber na largura disponível sem provocar rolagem horizontal ou impedir o uso de ações. Acima de 640 px, o grid SHALL manter o preenchimento responsivo existente.

#### Scenario: Estante com livros no celular estreito
- **WHEN** a pessoa abre o modo Capas da estante com ao menos dois livros em uma janela de 320 px
- **THEN** dois cards aparecem lado a lado, sem corte de controles nem rolagem horizontal

#### Scenario: Estante com livros no celular comum
- **WHEN** a pessoa abre o modo Capas da estante com ao menos dois livros em uma janela de 390 px
- **THEN** dois cards aparecem lado a lado e suas ações continuam utilizáveis

#### Scenario: Alternância de modo de visualização
- **WHEN** a pessoa escolhe Lista em uma janela de até 640 px
- **THEN** os livros são mostrados no modo Lista existente e a escolha de duas colunas não altera filtros, ordenação ou paginação

### Requirement: Seletor de status estilizado
O seletor de status abaixo de cada card e em cada linha da lista SHALL usar o `Select` do Base UI (`components/ui/select.tsx`), no mesmo visual de popup e de item dos demais selects do app. O gatilho MUST manter a pílula com o ponto da cor do status e o fundo com a cor do status a 16% sobre o cartão, ter o nome acessível "Status" e abrir a lista sem abrir a ficha do livro. No card de capa, o seletor MUST ocupar a largura toda do card. Até 640px, o gatilho MUST ter área de toque de pelo menos 44px de altura.

#### Scenario: Trocar status pelo seletor
- **WHEN** o usuário abre o seletor "Status" de um card e escolhe "Emprestado"
- **THEN** o popup estilizado fecha, a ficha não abre e o fluxo de empréstimo segue como antes

#### Scenario: Seletor pelo teclado
- **WHEN** o seletor "Status" está focado e o usuário pressiona Enter, navega com as setas e confirma
- **THEN** o status escolhido é aplicado e o foco volta ao gatilho

### Requirement: Ícones nas ações da Estante
As ações da lista (alternar status, editar e excluir) SHALL usar ícones do `lucide-react` no lugar dos glifos de texto: play para "Começar a ler", check para "Concluir leitura", seta circular para "Marcar como não lido", lápis para "Editar" e lixeira para "Excluir". Cada botão MUST manter o `aria-label` e o `title` atuais, e o ícone MUST ser decorativo (`aria-hidden`).

#### Scenario: Ações da lista com ícones
- **WHEN** o usuário abre a Estante em "Lista" acima de 640px
- **THEN** cada linha mostra os ícones de status, lápis e lixeira, e os botões continuam anunciados como "Começar a ler" (ou "Concluir leitura"/"Marcar como não lido"), "Editar" e "Excluir"

### Requirement: Cabeçalho compacto da Estante no celular
Até 640px de largura, o título "Estante" e o gatilho de ordenação SHALL ficar na mesma linha, um em cada ponta. O gatilho MUST mostrar só "Ordenar" enquanto a ordenação for a padrão ("recentes", sem `ordem` na URL); depois que a pessoa escolhe outra ordenação, o gatilho MUST mostrar o nome da opção escolhida. O nome acessível do gatilho MUST conter "Ordenar" nos dois casos. A alternância "Capas"/"Lista" MUST virar dois botões de ícone (grade e lista, do `lucide-react`), alinhados à direita logo acima da lista de livros, com `aria-label` "Capas" e "Lista", `aria-pressed` no ativo e área de toque de 44×44px. Acima de 640px, o cabeçalho SHALL manter o layout atual (contagem, título, "Ordenar <opção>" e controle segmentado com texto).

#### Scenario: Ordenação padrão no celular
- **WHEN** a Estante é aberta a 390px sem `ordem` na URL
- **THEN** "Estante" fica à esquerda e o botão "Ordenar" à direita, na mesma linha, sem o nome da ordenação

#### Scenario: Ordenação escolhida no celular
- **WHEN** a 390px o usuário escolhe "Título · Z–A" no menu
- **THEN** o menu fecha e o gatilho passa a mostrar "Título · Z–A"

#### Scenario: Alternar visualização no celular
- **WHEN** a 390px o usuário toca no ícone de lista acima dos livros
- **THEN** a Estante passa para "Lista" e o botão de lista fica marcado como pressionado

