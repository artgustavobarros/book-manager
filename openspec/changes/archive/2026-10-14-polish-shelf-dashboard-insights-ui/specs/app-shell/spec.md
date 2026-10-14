## MODIFIED Requirements

### Requirement: Header e navegação
O layout autenticado SHALL ter um header com a marca (que leva ao Painel), a busca, as abas Painel / Estante / Dados do acervo como controle segmentado, o botão de tema e o avatar. Cada aba MUST corresponder a uma rota (`/`, `/estante`, `/dados`). Acima de 1024px de largura, o header MUST ser fixo, translúcido com blur, e conter também "Me surpreenda" e "+ Registrar livro". Até 1024px, o header MUST ser compacto e não fixo: marca, botão de busca (44px), botão de tema (44px) e avatar (44px) numa linha, e as abas ocupando a largura toda na linha de baixo. O campo de busca MUST aparecer quando o botão de busca é acionado ou quando a pessoa escolhe editar uma consulta ativa. Recolher o campo MUST preservar o texto e o filtro. Enquanto houver texto, um botão de ícone "x" dentro do campo, à direita, nomeado "Limpar busca", MUST apagar o texto e o filtro, mantendo o campo aberto e focado; sem texto, o "x" não aparece e não há outro botão de limpar ao lado do campo. Se houver consulta ativa recolhida, o header MUST mostrá-la de forma visível e removível.

#### Scenario: Navegar entre abas
- **WHEN** o usuário clica em "Dados do acervo"
- **THEN** a URL muda para `/dados`, a aba fica ativa e a página rola ao topo

#### Scenario: Header compacto no mobile
- **WHEN** uma página autenticada é aberta a 390px de largura
- **THEN** o header tem no máximo 130px de altura sem busca expandida, não acompanha a rolagem e não mostra "Me surpreenda" nem "+ Registrar livro"

#### Scenario: Recolher a busca no mobile
- **WHEN** a 390px o usuário toca no botão de busca, digita "kindred" e recolhe o campo
- **THEN** a Estante continua filtrada por "kindred", a URL conserva `q=kindred` e a consulta ativa permanece visível no header

#### Scenario: Limpar a busca no mobile
- **WHEN** o usuário toca no "x" dentro do campo com a consulta "kindred" ativa
- **THEN** o texto e o parâmetro `q` são removidos, todos os livros compatíveis com os demais filtros voltam a aparecer e o campo continua aberto, vazio e focado

#### Scenario: Campo vazio sem botão de limpar
- **WHEN** a 390px o usuário abre a busca sem digitar nada
- **THEN** o campo não mostra o "x" e não há botão "Limpar" ao lado dele

### Requirement: Carrosséis abaixo de 640px
Abaixo de 640px de largura, os KPIs do Painel, os cards "Lendo agora" / "Últimos adicionados", os KPIs de Dados e os gráficos de Dados SHALL virar carrosséis horizontais com snap, arraste com mouse, indicadores de posição clicáveis e animação de 520 ms com easing out-quart, como no standalone. Cada item do carrossel MUST ocupar toda a largura útil do trilho (a largura da tela menos as margens laterais de 16px), um item por vez, sem mostrar parte do item seguinte. Os indicadores MUST ficar próximos entre si (no máximo 16px de espaço visível entre dois pontos inativos vizinhos), mantendo cada alvo de toque com pelo menos 24px de largura e 44px de altura.

#### Scenario: Arrastar com mouse
- **WHEN** a janela tem 390px e o usuário arrasta o carrossel de KPIs mais de 40px para a esquerda
- **THEN** o carrossel avança para o próximo item e o indicador correspondente fica ativo

#### Scenario: Item na largura toda
- **WHEN** a janela tem 390px e o usuário abre o Painel ou Dados do acervo
- **THEN** cada KPI, lista ou gráfico do carrossel tem 358px de largura (390px menos 16px de cada lado) e o item seguinte só aparece ao deslizar

#### Scenario: Indicadores próximos
- **WHEN** a janela tem 390px e o carrossel de gráficos de Dados mostra 6 indicadores
- **THEN** os pontos aparecem juntos, com até 16px de espaço visível entre eles, e cada um continua clicável

### Requirement: Botões flutuantes no mobile
Até 1024px de largura, o layout autenticado SHALL mostrar no canto inferior direito o botão "Registrar livro" (56px, "+") e, acima dele, o botão "Me surpreenda" (48px, ícone `Shuffle` do `lucide-react`), desabilitado e esmaecido quando não há livro "Não lido". Os botões MUST se esconder quando o usuário rola a página para baixo e voltar quando rola para cima ou chega ao topo. O fim de cada página MUST ter um espaço de 96px para que os botões não cubram o último conteúdo.

#### Scenario: Esconder ao rolar
- **WHEN** a 390px o usuário rola a Estante para baixo
- **THEN** os botões flutuantes saem da tela e não recebem cliques

#### Scenario: Voltar ao rolar para cima
- **WHEN** depois disso o usuário rola um pouco para cima
- **THEN** os botões flutuantes voltam a aparecer

#### Scenario: Sem livro não lido
- **WHEN** não há nenhum livro "Não lido"
- **THEN** o botão "Me surpreenda" aparece desabilitado com o título "Nenhum livro não lido para sortear"
