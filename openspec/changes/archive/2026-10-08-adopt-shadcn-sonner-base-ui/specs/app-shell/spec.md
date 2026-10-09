## MODIFIED Requirements

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
