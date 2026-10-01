## ADDED Requirements

### Requirement: Fidelidade visual ao design
As telas existentes em `design/handoff/source/Acervo.dc.html` (versão final) SHALL ser reproduzidas pixel a pixel, em tema claro e escuro, nas larguras desktop e mobile. Os valores visuais MUST vir dos tokens de `design/handoff/tokens/*` expostos ao Tailwind. Telas novas MUST usar apenas componentes, estados e tokens documentados no Design System.

#### Scenario: Comparação visual
- **WHEN** a suíte visual captura Painel, Estante (capas e lista), Dados, a ficha, a edição, Me surpreenda, Minha conta, Sincronizar planilha e a tela de entrada a 1440×900 e 390×844, nos dois temas, com o acervo de referência
- **THEN** cada captura corresponde à captura do standalone com o mesmo acervo, dentro da tolerância definida no design

### Requirement: Header e navegação
O layout autenticado SHALL ter o header fixo translúcido com blur, contendo a marca (que leva ao Painel), a busca, as abas Painel / Estante / Dados do acervo como controle segmentado, "Me surpreenda", "+ Registrar livro", o botão de tema e o avatar. Cada aba MUST corresponder a uma rota (`/`, `/estante`, `/dados`).

#### Scenario: Navegar entre abas
- **WHEN** o usuário clica em "Dados do acervo"
- **THEN** a URL muda para `/dados`, a aba fica ativa e a página rola ao topo

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
O sistema SHALL mostrar toasts centralizados no rodapé com a animação `acv-toast`, um por vez, substituindo o anterior e sumindo após 2,4 s.

#### Scenario: Toast em sequência
- **WHEN** duas ações disparam toasts em menos de 2,4 s
- **THEN** só o segundo toast fica visível, com a animação reiniciada

### Requirement: Modais
Todos os modais SHALL usar o véu preto a 45% com `acv-fade`, o painel com `acv-rise`, fechar com Esc ou clique no véu, e prender o foco dentro do modal enquanto aberto.

#### Scenario: Esc fecha o modal
- **WHEN** qualquer modal está aberto e o usuário pressiona Esc
- **THEN** o modal fecha e o foco volta ao elemento que o abriu

### Requirement: Carrosséis abaixo de 640px
Abaixo de 640px de largura, os KPIs do Painel, os cards "Lendo agora" / "Últimos adicionados", os KPIs de Dados e os gráficos de Dados SHALL virar carrosséis horizontais com snap, arraste com mouse, indicadores de posição clicáveis e animação de 520 ms com easing out-quart, como no standalone.

#### Scenario: Arrastar com mouse
- **WHEN** a janela tem 390px e o usuário arrasta o carrossel de KPIs mais de 40px para a esquerda
- **THEN** o carrossel avança para o próximo item e o indicador correspondente fica ativo

### Requirement: Telas de autenticação no padrão do design
A tela de entrada SHALL reproduzir o cartão de login do design (abas Entrar/Criar conta, botão Google, divisória "ou com e-mail", campos e CTA). As telas novas ("Verifique seu e-mail", "Esqueci minha senha", "Nova senha", link inválido) MUST usar o mesmo cartão, marca e componentes.

#### Scenario: Tela de verificação
- **WHEN** o cadastro é concluído
- **THEN** a tela "Verifique seu e-mail" aparece no mesmo cartão da entrada, com o endereço, a ação "Reenviar e-mail" e o link "Voltar para entrar"

### Requirement: Carregamento inicial sem flash de vazio
As páginas do app SHALL renderizar no servidor já com o acervo do usuário, sem mostrar momentaneamente um estado vazio ou um esqueleto antes dos dados.

#### Scenario: Abrir a Estante
- **WHEN** um usuário com livros abre `/estante`
- **THEN** o HTML inicial já contém os primeiros cards de livro
