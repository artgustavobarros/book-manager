## MODIFIED Requirements

### Requirement: Botões flutuantes no mobile
Até 1024px de largura, o layout autenticado SHALL mostrar no canto inferior direito o botão "Registrar livro" (56px, "+") e, acima dele, o botão "Me surpreenda" (48px, ícone `Shuffle` do `lucide-react`), com borda e ícone na cor de acento do projeto (`--acc`) quando habilitado, e desabilitado e esmaecido quando não há livro "Não lido". Os botões MUST se esconder quando o usuário rola a página para baixo e voltar quando rola para cima ou chega ao topo. O fim de cada página MUST ter um espaço de 96px para que os botões não cubram o último conteúdo.

#### Scenario: Esconder ao rolar
- **WHEN** a 390px o usuário rola a Estante para baixo
- **THEN** os botões flutuantes saem da tela e não recebem cliques

#### Scenario: Voltar ao rolar para cima
- **WHEN** depois disso o usuário rola um pouco para cima
- **THEN** os botões flutuantes voltam a aparecer

#### Scenario: Sem livro não lido
- **WHEN** não há nenhum livro "Não lido"
- **THEN** o botão "Me surpreenda" aparece desabilitado com o título "Nenhum livro não lido para sortear"

#### Scenario: Sorteio na cor de acento
- **WHEN** a 390px há livro "Não lido"
- **THEN** o botão "Me surpreenda" aparece com a borda e o ícone na cor de acento do tema, como o "+ Registrar livro"
