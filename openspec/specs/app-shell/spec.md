# app-shell Specification

## Purpose
TBD - created by archiving change bodega-literaria-app. Update Purpose after archive.
## Requirements
### Requirement: Fidelidade visual ao design
As telas existentes em `design/handoff/source/Acervo.dc.html` (standalone da identidade bordô: paleta papel/tinta/bordô/ouro, títulos em Fraunces e interface em Instrument Sans) SHALL ser reproduzidas pixel a pixel, em tema claro e escuro, nas larguras desktop e mobile, exceto nos casos em que esta change ou mudanças anteriores divergem de propósito do standalone (selo de status fora da capa, Estante em 1 coluna, lista responsiva, paginação, campos extras da ficha e ajustes necessários de contraste/foco). Os casos que divergem MUST ser cobertos por baselines visuais próprias, como as telas novas. Os valores visuais SHALL partir dos tokens de `design/handoff/tokens/*` expostos ao Tailwind (`@theme`), podendo ser ajustados para cumprir contraste e legibilidade; componentes MUST aplicar cores e fontes por utilitários do Tailwind ligados a esses tokens, sem valores de cor fixos nem variáveis CSS paralelas aos tokens. Telas novas MUST usar componentes, estados e tokens documentados no Design System.

#### Scenario: Comparação visual
- **WHEN** a suíte visual captura Painel, Estante (capas e lista), Dados, a ficha, a edição, Me surpreenda, Minha conta, Sincronizar planilha e a tela de entrada a 1440×900 e 390×844, nos dois temas, com o acervo de referência
- **THEN** cada captura que não diverge de propósito corresponde à captura do standalone com o mesmo acervo, dentro da tolerância definida no design

#### Scenario: Caso que diverge de propósito
- **WHEN** a suíte visual captura uma tela listada como divergente (por exemplo, a lista móvel a 390×844)
- **THEN** a captura é comparada com a baseline própria versionada em `tests/visual`, e não com o standalone

#### Scenario: Ação primária bordô
- **WHEN** o usuário passa o mouse em "+ Registrar livro" no tema claro
- **THEN** o botão, que tem fundo `#7A2232` e texto `#FBF8F2`, passa a ter fundo `#5A1724`

#### Scenario: Tipografia
- **WHEN** o Painel é exibido
- **THEN** a saudação, os valores dos KPIs e o número da meta usam Fraunces, e os rótulos, botões e textos de interface usam Instrument Sans, ambas servidas pelo próprio app

### Requirement: Header e navegação
O layout autenticado SHALL ter um header com a marca (que leva ao Painel), a busca, as abas Painel / Estante / Dados do acervo como controle segmentado, o botão de tema e o avatar. Cada aba MUST corresponder a uma rota (`/`, `/estante`, `/dados`). Acima de 640px de largura, o header MUST ser fixo, translúcido com blur, e conter também "Me surpreenda" e "+ Registrar livro". Até 640px, o header MUST ser compacto e não fixo: marca, botão de busca (44px), botão de tema (44px) e avatar (44px) numa linha, e as abas ocupando a largura toda na linha de baixo. O campo de busca MUST aparecer quando o botão de busca é acionado ou quando a pessoa escolhe editar uma consulta ativa. Recolher o campo MUST preservar o texto e o filtro; uma ação separada, nomeada "Limpar busca", MUST apagá-los. Se houver consulta ativa recolhida, o header MUST mostrá-la de forma visível e removível.

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
- **WHEN** o usuário aciona "Limpar busca" com a consulta "kindred" ativa
- **THEN** o texto e o parâmetro `q` são removidos e todos os livros compatíveis com os demais filtros voltam a aparecer

### Requirement: Rodapé
O rodapé SHALL mostrar a assinatura da marca e as ações "Sincronizar planilha", "Exportar Excel (CSV)", "Salvar backup" e "Restaurar backup". O texto da assinatura MUST deixar de dizer que os livros ficam guardados no navegador.

#### Scenario: Texto do rodapé
- **WHEN** qualquer página autenticada é exibida
- **THEN** o rodapé mostra "Bodega Literária · os livros de casa, guardados na sua conta."

### Requirement: Tema claro e escuro sem flash
O tema SHALL alternar pelo botão ☾/☀ (no header e na tela de entrada), ser persistido em cookie e aplicado no HTML renderizado pelo servidor, sem flash do tema errado no carregamento.

#### Scenario: Recarregar no escuro
- **WHEN** o usuário com o tema escuro recarrega qualquer página
- **THEN** o primeiro frame já é renderizado com `data-theme="dark"`

### Requirement: Toasts
O sistema SHALL mostrar toasts com o Sonner do shadcn, um por vez, substituindo o anterior. Cada toast MUST ter um tipo (sucesso, erro, aviso ou informação; sucesso por padrão) e MUST ser um card com ícone colorido do tipo (✓, !, ! e i), a mensagem, uma nota opcional em texto secundário, um botão "Fechar notificação" e uma barra no rodapé que esvazia durante o tempo de exibição. O toast MUST sumir após 3 s, após 4,8 s quando tiver nota e após 6 s quando for de erro, ou ao ser fechado; enquanto o ponteiro estiver sobre o toast, o tempo e a barra MUST pausar. Todos os toasts MUST ser anunciados pela região viva "Notificações" do Sonner, que fica montada mesmo sem mensagem. Enquanto o e-mail da conta não estiver confirmado, um toast de sucesso sem nota MUST receber a nota "Seus dados foram salvos, mas o cadastro ainda não está completo: confirme seu e-mail." Acima de 600px, o toast MUST ficar centralizado no rodapé com até 440px de largura; até 600px, MUST ficar no canto inferior esquerdo, ao lado dos botões flutuantes, sem se sobrepor a eles.

#### Scenario: Toast em sequência
- **WHEN** duas ações disparam toasts em menos de 3 s
- **THEN** só o segundo toast fica visível, com a barra de tempo reiniciada

#### Scenario: Toast no mobile
- **WHEN** a 390px uma ação dispara um toast
- **THEN** o toast não se sobrepõe aos botões flutuantes

#### Scenario: Toast de erro com nota
- **WHEN** a restauração de um backup falha
- **THEN** aparece na região "Notificações" um toast de erro com ícone "!", a mensagem e a nota explicativa, que some após 6 s

#### Scenario: Fechar toast
- **WHEN** o usuário aciona "Fechar notificação"
- **THEN** o toast some imediatamente

#### Scenario: Cadastro pendente
- **WHEN** um usuário com e-mail ainda não confirmado salva um livro
- **THEN** o toast "Livro registrado no acervo" traz a nota pedindo para confirmar o e-mail e fica visível por 4,8 s

### Requirement: Modais
Todos os modais SHALL usar o véu preto a 45% com `acv-fade`, o painel com `acv-rise` e prender o foco dentro do modal enquanto aberto. Modais sem alterações MUST fechar com Esc, clique no véu ou botão de fechar e devolver o foco ao elemento que os abriu. Nos modais de registro/edição de livro, Minha conta e Sincronizar planilha, uma tentativa de fechar ou navegar com alterações não salvas MUST pedir confirmação com ações explícitas para continuar editando ou descartar; sem confirmação, os valores e o foco MUST ser preservados.

#### Scenario: Esc fecha modal sem alterações
- **WHEN** um modal sem alterações está aberto e o usuário pressiona Esc
- **THEN** o modal fecha e o foco volta ao elemento que o abriu

#### Scenario: Esc com rascunho
- **WHEN** o usuário digitou dados no modal "Registrar livro" e pressiona Esc
- **THEN** aparece uma confirmação de descarte, e escolher "Continuar editando" mantém os dados digitados

#### Scenario: Fechar aba com rascunho
- **WHEN** existe um formulário alterado e o usuário tenta recarregar ou fechar a aba
- **THEN** o navegador solicita confirmação antes de descartar o rascunho

#### Scenario: Navegar com rascunho
- **WHEN** existe um formulário alterado e o usuário usa uma navegação interna ou o histórico
- **THEN** o rascunho continua disponível até que o usuário escolha descartá-lo ou salvá-lo

### Requirement: Carrosséis abaixo de 640px
Abaixo de 640px de largura, os KPIs do Painel, os cards "Lendo agora" / "Últimos adicionados", os KPIs de Dados e os gráficos de Dados SHALL virar carrosséis horizontais com snap, arraste com mouse, indicadores de posição clicáveis e animação de 520 ms com easing out-quart, como no standalone.

#### Scenario: Arrastar com mouse
- **WHEN** a janela tem 390px e o usuário arrasta o carrossel de KPIs mais de 40px para a esquerda
- **THEN** o carrossel avança para o próximo item e o indicador correspondente fica ativo

### Requirement: Telas de autenticação no padrão do design
A tela de entrada SHALL reproduzir o cartão de login do design (abas Entrar/Criar conta, botão Google, divisória "ou com e-mail", campos e CTA). As telas novas ("Verifique seu e-mail", "Esqueci minha senha", "Nova senha", link inválido) MUST usar o mesmo cartão, marca e componentes. O cadastro bem-sucedido MUST levar ao Painel; a tela "Verifique seu e-mail" permanece disponível para links inválidos ou expirados e reenvio.

#### Scenario: Cadastro concluído
- **WHEN** o cadastro com e-mail e senha é concluído
- **THEN** o Painel aparece com o aviso de confirmação pendente, sem exigir passagem pela tela "Verifique seu e-mail"

#### Scenario: Link inválido ou expirado
- **WHEN** o usuário abre um link de confirmação inválido ou expirado
- **THEN** a tela "Verifique seu e-mail" mostra o erro e a ação "Reenviar e-mail" no mesmo cartão da entrada

### Requirement: Carregamento inicial sem flash de vazio
As páginas do app SHALL renderizar no servidor já com o acervo do usuário, sem mostrar momentaneamente um estado vazio ou um esqueleto antes dos dados.

#### Scenario: Abrir a Estante
- **WHEN** um usuário com livros abre `/estante`
- **THEN** o HTML inicial já contém os primeiros cards de livro

### Requirement: Botões flutuantes no mobile
Até 640px de largura, o layout autenticado SHALL mostrar no canto inferior direito o botão "Registrar livro" (56px, "+") e, acima dele, o botão "Me surpreenda" (48px, 🎲), desabilitado e esmaecido quando não há livro "Não lido". Os botões MUST se esconder quando o usuário rola a página para baixo e voltar quando rola para cima ou chega ao topo. O fim de cada página MUST ter um espaço de 96px para que os botões não cubram o último conteúdo.

#### Scenario: Esconder ao rolar
- **WHEN** a 390px o usuário rola a Estante para baixo
- **THEN** os botões flutuantes saem da tela e não recebem cliques

#### Scenario: Voltar ao rolar para cima
- **WHEN** depois disso o usuário rola um pouco para cima
- **THEN** os botões flutuantes voltam a aparecer

#### Scenario: Sem livro não lido
- **WHEN** não há nenhum livro "Não lido"
- **THEN** o botão 🎲 aparece desabilitado com o título "Nenhum livro não lido para sortear"

### Requirement: Mutações sem falso sucesso
Toda ação que altera dados (editar, registrar, excluir, mudar status, favoritar, atribuir ano, meta) SHALL mostrar a mensagem de sucesso só depois que a API confirmar. Quando a API falha, a mudança otimista MUST ser desfeita e a mensagem de erro MUST ficar visível, sem ser substituída por uma mensagem de sucesso. Na edição e no registro, o modal MUST continuar aberto com os valores digitados.

#### Scenario: Falha ao salvar a edição
- **WHEN** o usuário salva a ficha e a API responde com erro
- **THEN** o modal continua aberto com os campos preenchidos, o toast mostra o erro e nenhum toast "Alterações salvas" aparece

#### Scenario: Falha ao excluir
- **WHEN** o usuário confirma a exclusão e a API responde com erro
- **THEN** o livro volta para a lista e o toast mostra o erro, sem "Livro excluído"

#### Scenario: Meta clicada em sequência
- **WHEN** o usuário clica em "+" na meta três vezes seguidas
- **THEN** o valor salvo no servidor é o último valor exibido

### Requirement: Botões assíncronos com trava
Botões que disparam uma operação de rede (buscar online, entrar com Google, reenviar verificação, vincular Google, sair da conta) SHALL ficar desabilitados e indicar progresso enquanto a operação não termina. A busca online MUST ignorar a resposta de uma busca que já foi substituída por outra mais recente.

#### Scenario: Duplo clique em Buscar
- **WHEN** o usuário clica duas vezes em "Buscar" na busca online
- **THEN** só uma busca é disparada e o botão mostra "Buscando…" até ela terminar

### Requirement: Acesso pelo teclado
Todo elemento que abre a ficha de um livro ou filtra a Estante SHALL ser alcançável com Tab e acionável com Enter ou Espaço, com nome acessível: card e linha da Estante, itens de "Lendo agora", "Últimos adicionados" e "Lidos em <ano>" no Painel, linhas de "Atribuir ano lido" em Dados e o nome do autor. Controles de escolha MUST expor o estado selecionado (`aria-pressed` ou equivalente), e menus MUST usar papéis ARIA compatíveis com o conteúdo.

#### Scenario: Abrir a ficha pelo teclado
- **WHEN** o usuário navega com Tab até um livro da Estante e pressiona Enter
- **THEN** a ficha desse livro abre

#### Scenario: Mini-capa com nome
- **WHEN** um leitor de tela foca a mini-capa de um livro em "Lendo agora"
- **THEN** o nome anunciado é o título do livro, não a inicial

### Requirement: Legibilidade e contraste dos controles
Textos e controles essenciais SHALL manter contraste WCAG AA nos temas claro e escuro, inclusive abas inativas, chips, contadores e avatar. Texto comum MUST alcançar pelo menos 4,5:1; ícones e limites visuais necessários à operação MUST alcançar pelo menos 3:1. Os testes automatizados de acessibilidade MUST executar a regra `color-contrast` sem desabilitá-la nas telas principais.

#### Scenario: Tema claro em tela pequena
- **WHEN** axe analisa Entrar, Estante e Dados a 390px no tema claro após o fim das animações
- **THEN** não há violação `color-contrast` nas regiões testadas

#### Scenario: Tema escuro em tela pequena
- **WHEN** axe analisa Entrar, Estante e Dados a 390px no tema escuro após o fim das animações
- **THEN** não há violação `color-contrast` nas regiões testadas

### Requirement: Atalho para conteúdo principal
As páginas autenticadas SHALL apresentar “Pular para o conteúdo” como o primeiro item focável. O atalho MUST ficar visível ao receber foco e levar o teclado ao início do `<main>` da página atual, sem ser encoberto pelo header fixo.

#### Scenario: Pular o cabeçalho
- **WHEN** o usuário abre Estante, pressiona Tab uma vez e ativa “Pular para o conteúdo”
- **THEN** o foco vai ao conteúdo principal e o próximo Tab alcança o primeiro controle da Estante

### Requirement: Aviso de confirmação de e-mail pendente
Todas as páginas autenticadas SHALL exibir um aviso abaixo do cabeçalho quando o e-mail da conta estiver pendente. O aviso MUST mostrar o endereço do usuário, informar que ele pode usar o acervo e que os dados ficam salvos, e oferecer “Reenviar e-mail”, “Já confirmei” e um controle acessível para fechar. O aviso MUST se adaptar a telas pequenas sem cortar conteúdo nem impedir o uso da página.

#### Scenario: Primeira abertura de uma conta pendente
- **WHEN** um usuário com `emailVerified = false` abre Painel, Estante ou Dados
- **THEN** o aviso aparece com o e-mail da conta e as três ações, e a página continua utilizável

#### Scenario: Fechamento temporário
- **WHEN** o usuário pendente fecha o aviso
- **THEN** ele desaparece na página atual e reaparece ao mudar de página ou recarregar, enquanto o e-mail continuar pendente

#### Scenario: Reenviar link
- **WHEN** o usuário pendente aciona “Reenviar e-mail”
- **THEN** a ação indica progresso, impede envio duplicado e informa o resultado sem esconder o aviso; o limite de tentativas de autenticação permanece aplicado

#### Scenario: Confirmado em outra aba
- **WHEN** o usuário concluiu a verificação em outra aba e aciona “Já confirmei”, muda de página ou volta à aba
- **THEN** o sistema consulta o estado atual da conta e remove o aviso após confirmar `emailVerified = true`

#### Scenario: Confirmação ainda pendente
- **WHEN** o usuário aciona “Já confirmei” e o e-mail ainda não foi verificado
- **THEN** o aviso permanece e informa que a confirmação ainda não consta

#### Scenario: Conta verificada
- **WHEN** um usuário com `emailVerified = true` abre ou recarrega qualquer página autenticada
- **THEN** o aviso não aparece

### Requirement: Marca e wordmark
O header (desktop e mobile) e a tela de entrada SHALL mostrar a marca da Bodega (dois livros deitados em tinta, garrafa bordô com rótulo e linha de base) ao lado do wordmark em duas linhas: "Bodega" em Fraunces 700 na cor do texto principal e "Literária" em Fraunces itálico 500 na cor de acento. Na entrada, a marca MUST ter 36px de altura e o wordmark 24px; no header, 30px e 18px. A marca MUST ser decorativa para leitores de tela, e o botão da marca no header MUST continuar levando ao Painel.

#### Scenario: Marca no header
- **WHEN** qualquer página autenticada é exibida
- **THEN** o header mostra a marca nova e "Bodega" / "Literária" empilhados, e clicar neles leva a `/`

#### Scenario: Marca no tema escuro
- **WHEN** a tela de entrada é exibida no tema escuro
- **THEN** a garrafa e "Literária" usam o acento do tema escuro, e os livros, a linha de base e "Bodega" usam o texto principal do tema escuro

### Requirement: Busca mobile ergonômica com foco automático
No viewport móvel (até 640px), o acionamento do botão de busca no header SHALL expandir o campo de busca e focar imediatamente o elemento de entrada (`input`), permitindo digitação instantânea sem exigir um segundo toque do usuário.

#### Scenario: Abrir busca no smartphone
- **WHEN** o usuário em viewport de 390px toca no ícone de busca do header
- **THEN** o campo de busca abre com foco automático e teclado virtual disponível para digitação imediata

