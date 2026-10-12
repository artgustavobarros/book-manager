## MODIFIED Requirements

### Requirement: Mutações sem falso sucesso
Toda ação que altera dados (editar, registrar, excluir, mudar status, favoritar, atribuir ano, meta) SHALL mostrar a mensagem de sucesso só depois que a API confirmar. Quando a API falha, a mudança otimista MUST ser desfeita e a mensagem de erro MUST ficar visível, sem ser substituída por uma mensagem de sucesso. Na edição e no registro, o modal MUST continuar aberto com os valores digitados. O rollback MUST desfazer só o que a ação que falhou mudou: no livro afetado, só os campos que ela alterou e que ainda guardam o valor otimista. Outros livros, livros criados ou excluídos nesse meio-tempo, capas aplicadas localmente e mudanças mais recentes no mesmo livro MUST continuar como estão.

#### Scenario: Falha ao salvar a edição
- **WHEN** o usuário salva a ficha e a API responde com erro
- **THEN** o modal continua aberto com os campos preenchidos, o toast mostra o erro e nenhum toast "Alterações salvas" aparece

#### Scenario: Falha ao excluir
- **WHEN** o usuário confirma a exclusão e a API responde com erro
- **THEN** o livro volta para a lista e o toast mostra o erro, sem "Livro excluído"

#### Scenario: Meta clicada em sequência
- **WHEN** o usuário clica em "+" na meta três vezes seguidas
- **THEN** o valor salvo no servidor é o último valor exibido

#### Scenario: Falha em um livro não desfaz outro
- **WHEN** o usuário muda o status do livro A e, antes da resposta, registra o livro B ou muda o status de B. Depois disso, o PATCH de A falha.
- **THEN** A volta ao status anterior, e B continua na lista com a mudança feita

#### Scenario: Falha ao excluir não ressuscita nem apaga outros
- **WHEN** o usuário exclui o livro A e, antes da resposta, exclui o livro B com sucesso. Depois disso, o DELETE de A falha.
- **THEN** A volta para a lista, e B continua fora dela

#### Scenario: Capa aplicada durante a mutação
- **WHEN** a busca automática aplica uma capa ao livro B enquanto o PATCH do livro A está pendente, e esse PATCH falha
- **THEN** B continua com a capa nova

#### Scenario: Mudança mais recente no mesmo livro
- **WHEN** o usuário favorita o livro A e, antes da resposta, muda o status de A. Depois disso, só o PATCH do favorito falha.
- **THEN** o favorito volta ao valor anterior, e A mantém o status novo
