## ADDED Requirements

### Requirement: Modal Minha conta
O sistema SHALL abrir o modal "Minha conta" pelo avatar do header, mostrando as iniciais (até 2, a partir do nome ou do e-mail), o nome, o e-mail e as seções Perfil, Alterar senha, Conta Google, Excluir conta e "Sair da conta", seguindo o layout de `Acervo.dc.html` nas partes existentes e o Design System nas novas.

#### Scenario: Abrir o modal
- **WHEN** o usuário clica no avatar
- **THEN** o modal abre com os campos preenchidos com os dados atuais do usuário

#### Scenario: Fechar com Esc ou clique fora
- **WHEN** o modal está aberto e o usuário pressiona Esc ou clica no véu
- **THEN** o modal fecha sem salvar alterações pendentes

### Requirement: Editar nome
O sistema SHALL permitir alterar o nome de exibição. O nome MUST ser não vazio após trim.

#### Scenario: Nome válido
- **WHEN** o usuário altera o nome e clica em "Salvar perfil"
- **THEN** o nome é persistido, as iniciais e a saudação do Painel são atualizadas e aparece o toast "Perfil atualizado"

#### Scenario: Nome vazio
- **WHEN** o usuário tenta salvar com o nome vazio
- **THEN** a mensagem "Informe seu nome." aparece e nada é salvo

### Requirement: Trocar e-mail com confirmação
O sistema SHALL permitir trocar o e-mail somente após a confirmação por um link enviado ao novo endereço. Até a confirmação, o e-mail atual MUST continuar valendo.

#### Scenario: Pedido de troca
- **WHEN** o usuário informa um e-mail novo e válido e salva o perfil
- **THEN** o sistema envia o link ao novo endereço e informa "Enviamos um link para confirmar o novo e-mail", mantendo o e-mail atual

#### Scenario: E-mail inválido ou em uso
- **WHEN** o novo e-mail é inválido ou já pertence a outra conta
- **THEN** a mensagem de erro aparece no perfil e nenhum link é enviado

### Requirement: Trocar senha
O sistema SHALL permitir trocar a senha informando a senha atual, a nova senha (mínimo 8 caracteres) e a confirmação. A troca MUST revogar as outras sessões do usuário. Usuários sem senha (somente Google) MUST ver a seção substituída por um texto explicando que entram com Google.

#### Scenario: Troca válida
- **WHEN** a senha atual está correta e a nova senha é válida e confirmada
- **THEN** a senha é atualizada, os campos são limpos, as outras sessões são revogadas e aparece o toast "Senha alterada"

#### Scenario: Validações
- **WHEN** a senha atual está vazia ou incorreta, a nova senha tem menos de 8 caracteres, ou a confirmação não confere
- **THEN** a mensagem correspondente aparece na seção e nada é alterado

### Requirement: Conta Google vinculada
O sistema SHALL mostrar se há uma conta Google vinculada e permitir vincular uma estando logado. Desvincular MUST ser permitido somente se o usuário tiver senha definida.

#### Scenario: Vincular estando logado
- **WHEN** o usuário clica em "Vincular Google" e conclui o OAuth
- **THEN** a conta Google é vinculada ao usuário atual e a seção passa a mostrar o e-mail Google vinculado

#### Scenario: Desvincular sem senha
- **WHEN** um usuário que só tem login Google tenta desvincular o Google
- **THEN** a ação não fica disponível, com a explicação de que é o único meio de acesso

### Requirement: Excluir conta e dados
O sistema SHALL permitir excluir a própria conta. A exclusão MUST remover o usuário, as sessões, as contas vinculadas, os livros, as metas e as configurações. Ela MUST exigir a senha (ou, para contas somente Google, uma sessão recente) e seguir o padrão de confirmação destrutiva em dois cliques do Design System.

#### Scenario: Exclusão confirmada
- **WHEN** o usuário informa a senha, clica em "Excluir conta" e depois em "Confirmar exclusão"
- **THEN** todos os dados do usuário são removidos, a sessão é encerrada e a tela de entrada aparece com a mensagem "Conta excluída"

#### Scenario: Senha incorreta
- **WHEN** a senha informada está incorreta
- **THEN** nada é excluído e a mensagem de erro aparece na seção
