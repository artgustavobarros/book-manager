## MODIFIED Requirements

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

## ADDED Requirements

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
