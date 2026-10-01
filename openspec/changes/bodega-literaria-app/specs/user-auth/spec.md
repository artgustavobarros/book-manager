## ADDED Requirements

### Requirement: Cadastro com e-mail e senha
O sistema SHALL permitir que qualquer visitante crie uma conta informando nome, e-mail, senha e confirmação de senha na aba "Criar conta" da tela de entrada. A senha MUST ter no mínimo 8 caracteres e MUST ser armazenada apenas como hash. A conta criada MUST começar com e-mail não verificado e acervo vazio.

#### Scenario: Cadastro válido
- **WHEN** o visitante preenche nome, e-mail inédito, senha válida e confirmação igual e envia o formulário
- **THEN** o sistema cria o usuário com `emailVerified = false`, envia o e-mail de verificação e mostra a tela "Verifique seu e-mail" com o endereço informado

#### Scenario: Senhas diferentes
- **WHEN** a confirmação de senha difere da senha
- **THEN** o formulário não é enviado e mostra a mensagem de erro no padrão de campo com erro do Design System

#### Scenario: E-mail já cadastrado e verificado
- **WHEN** o visitante tenta se cadastrar com um e-mail que pertence a uma conta verificada
- **THEN** o sistema recusa o cadastro com uma mensagem genérica e não altera a conta existente

### Requirement: Verificação de e-mail obrigatória
O sistema SHALL enviar um link de verificação de uso único, com validade de 24 horas, para o e-mail cadastrado. O login com e-mail e senha MUST ser recusado enquanto o e-mail não estiver verificado.

#### Scenario: Link válido
- **WHEN** o usuário abre o link de verificação dentro da validade
- **THEN** o sistema marca o e-mail como verificado, cria a sessão e redireciona para o Painel

#### Scenario: Login antes de verificar
- **WHEN** um usuário com e-mail não verificado tenta entrar com e-mail e senha corretos
- **THEN** o sistema recusa a entrada, informa que o e-mail precisa ser confirmado e oferece "Reenviar e-mail de verificação"

#### Scenario: Link expirado ou já usado
- **WHEN** o usuário abre um link de verificação expirado ou já consumido
- **THEN** o sistema mostra uma mensagem de link inválido com a ação de reenviar a verificação

### Requirement: Limpeza de cadastros não verificados
O sistema SHALL excluir automaticamente contas com e-mail não verificado criadas há mais de 7 dias, para que um e-mail não fique ocupado indefinidamente por um cadastro abandonado ou malicioso.

#### Scenario: Rotina diária
- **WHEN** a rotina agendada diária é executada
- **THEN** usuários com `emailVerified = false` e criados há mais de 7 dias são excluídos, junto com seus registros dependentes

#### Scenario: Chamada não autorizada da rotina
- **WHEN** o endpoint da rotina é chamado sem o segredo de cron correto
- **THEN** o sistema responde 401 e não exclui nada

### Requirement: Login com e-mail e senha
O sistema SHALL autenticar usuários verificados por e-mail e senha e criar uma sessão persistida no banco, referenciada por um cookie httpOnly, secure e SameSite=Lax.

#### Scenario: Credenciais corretas
- **WHEN** um usuário verificado envia e-mail e senha corretos
- **THEN** o sistema cria a sessão, define o cookie e redireciona para o Painel

#### Scenario: Credenciais incorretas
- **WHEN** o e-mail não existe ou a senha está errada
- **THEN** o sistema mostra a mesma mensagem genérica de "E-mail ou senha incorretos" nos dois casos

### Requirement: Recuperação de senha
O sistema SHALL oferecer "Esqueci minha senha" na tela de entrada, enviando um link de redefinição de uso único com validade de 1 hora. Redefinir a senha MUST encerrar todas as outras sessões do usuário.

#### Scenario: Pedido de redefinição
- **WHEN** o visitante informa um e-mail em "Esqueci minha senha"
- **THEN** o sistema mostra sempre a mesma confirmação ("Se houver uma conta, enviamos um link"), exista ou não a conta, e envia o link somente se ela existir

#### Scenario: Nova senha definida
- **WHEN** o usuário abre um link válido e define uma nova senha com confirmação igual
- **THEN** o hash da senha é atualizado, as demais sessões são revogadas e o usuário é levado à tela de entrada com uma confirmação

### Requirement: Login com Google com vinculação segura
O sistema SHALL permitir entrar com Google. O primeiro login com uma conta Google cujo e-mail não exista MUST criar o usuário já verificado. A vinculação automática a uma conta de senha existente com o mesmo e-mail MUST acontecer somente se essa conta já estiver verificada.

#### Scenario: Primeiro acesso via Google
- **WHEN** alguém entra com Google usando um e-mail sem conta
- **THEN** o sistema cria o usuário com `emailVerified = true`, registra a conta Google e abre o Painel

#### Scenario: E-mail existente verificado
- **WHEN** alguém entra com Google usando o e-mail de uma conta de senha verificada
- **THEN** o sistema vincula a conta Google a esse usuário e cria a sessão

#### Scenario: E-mail existente não verificado
- **WHEN** alguém entra com Google usando o e-mail de uma conta de senha não verificada
- **THEN** o sistema NÃO vincula e NÃO autentica, e a tela de entrada informa que existe um cadastro pendente com esse e-mail, oferecendo "Esqueci minha senha" para assumir a conta

#### Scenario: Redefinir a senha prova a posse do e-mail
- **WHEN** o dono do e-mail conclui "Esqueci minha senha" numa conta ainda não verificada
- **THEN** a conta passa a ter o e-mail verificado, a senha anterior deixa de valer, todas as sessões são revogadas e o login com Google para esse e-mail passa a vincular normalmente

### Requirement: Logout
O sistema SHALL encerrar a sessão atual em "Sair da conta", revogando-a no banco e removendo o cookie.

#### Scenario: Sair
- **WHEN** o usuário clica em "Sair da conta" no modal Minha conta
- **THEN** a sessão é revogada e o usuário é levado à tela de entrada

### Requirement: Rate limiting das rotas de autenticação
O sistema SHALL limitar tentativas nas rotas de login, cadastro, reenvio de verificação e recuperação de senha por IP, com o estado do limite persistido no banco, para funcionar entre instâncias serverless.

#### Scenario: Excesso de tentativas
- **WHEN** um mesmo IP excede o limite de tentativas de login na janela configurada
- **THEN** o sistema responde 429 e a UI informa que é preciso aguardar antes de tentar de novo

### Requirement: Proteção de rotas
O sistema SHALL exigir sessão válida em todas as páginas do app (Painel, Estante, Dados) e em todas as rotas de API de dados. Páginas de autenticação MUST redirecionar para o Painel quando já houver sessão.

#### Scenario: Acesso sem sessão a uma página
- **WHEN** um visitante sem sessão abre `/estante`
- **THEN** o sistema redireciona para a tela de entrada

#### Scenario: Acesso sem sessão à API
- **WHEN** uma rota de API de dados é chamada sem sessão válida
- **THEN** o sistema responde 401 sem dados

#### Scenario: Usuário logado abre a tela de entrada
- **WHEN** um usuário com sessão válida abre a tela de entrada
- **THEN** o sistema redireciona para o Painel

### Requirement: Envio de e-mails transacionais
O sistema SHALL enviar os e-mails de verificação, redefinição de senha e confirmação de troca de e-mail via Gmail SMTP, através de uma interface de envio única que permita trocar o provedor sem alterar o restante do código. Os e-mails MUST usar o nome de exibição "Bodega Literária" e um layout HTML simples, com a paleta do Design System e versão em texto puro.

#### Scenario: Envio sem revelar se a conta existe
- **WHEN** um e-mail de verificação ou de redefinição é disparado
- **THEN** o envio acontece em segundo plano (`waitUntil`), sem aumentar o tempo de resposta, para não revelar se a conta existe

#### Scenario: Falha no envio
- **WHEN** o provedor SMTP falha ao enviar um e-mail
- **THEN** o sistema registra o erro no servidor, e as telas "Verifique seu e-mail" e de link inválido continuam oferecendo "Reenviar"
