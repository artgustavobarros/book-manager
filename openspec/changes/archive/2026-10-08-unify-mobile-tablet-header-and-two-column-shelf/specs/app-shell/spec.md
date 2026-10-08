## ADDED Requirements

### Requirement: Cabeçalho compacto consistente no celular e no tablet
O sistema SHALL exibir o mesmo cabeçalho compacto em páginas autenticadas quando a largura da janela for de até 1024 px. Esse cabeçalho MUST oferecer marca, abas Painel, Estante e Dados do acervo, além dos ícones de busca, tema e conta com os mesmos rótulos e ações em celular e tablet. Acima de 1024 px, o sistema SHALL exibir somente o cabeçalho largo.

#### Scenario: Celular e tablet mostram as mesmas ações
- **WHEN** a pessoa abre uma página autenticada com largura de 390 px ou 768 px
- **THEN** há exatamente um cabeçalho visível com os ícones de busca, tema e conta e as mesmas três abas de navegação

#### Scenario: Busca funciona no tablet como no celular
- **WHEN** a pessoa abre a busca pelo ícone em uma janela de 768 px
- **THEN** o campo de busca recebe foco e permite consultar o acervo sem perder o valor ao recolher a busca

#### Scenario: Limite entre tablet e desktop
- **WHEN** a largura da janela passa de 1024 px para 1025 px
- **THEN** somente o cabeçalho largo fica visível

### Requirement: Ações de acervo disponíveis com o cabeçalho compacto
O sistema SHALL oferecer os controles flutuantes de registrar livro e me surpreenda em toda largura que usar o cabeçalho compacto, inclusive em tablets. O estado indisponível de me surpreenda MUST continuar visível e desabilitado quando não houver livro elegível, e o conteúdo final da página MUST permanecer acessível sem ser coberto pelos controles.

#### Scenario: Tablet com livro elegível
- **WHEN** a pessoa usa a estante em uma janela de 768 px e existe um livro não lido
- **THEN** consegue abrir o registro e o sorteio pelos controles flutuantes

#### Scenario: Tablet sem livro elegível
- **WHEN** a pessoa usa a estante em uma janela de 1024 px e não existe livro não lido
- **THEN** o controle de sorteio está visível e desabilitado, enquanto o registro permanece disponível
