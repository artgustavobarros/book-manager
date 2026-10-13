## MODIFIED Requirements

### Requirement: Busca global
O campo de busca do header SHALL filtrar por título, autor, editora, nacionalidade, gênero, nome de quem pegou emprestado e anotações, sem diferenciar acentos nem maiúsculas. Digitar na busca MUST levar o usuário à Estante. Quando a digitação começa fora da Estante, o campo MUST manter todos os caracteres digitados enquanto a navegação acontece, a Estante MUST abrir filtrada pelo texto completo e a ida à Estante MUST criar uma única entrada no histórico do navegador.

#### Scenario: Busca sem acento
- **WHEN** o usuário digita "sertao" na busca
- **THEN** "Grande sertão: veredas" aparece entre os resultados

#### Scenario: Digitar rápido fora da Estante
- **WHEN** no Painel o usuário digita "kindred" na busca do header sem pausa entre as teclas
- **THEN** a Estante abre com `q=kindred` na URL, o campo mostra "kindred" e só o livro "Kindred" aparece

#### Scenario: Voltar depois de buscar a partir de outra página
- **WHEN** o usuário digita "kindred" na busca a partir do Painel e, já na Estante, usa o "voltar" do navegador
- **THEN** o navegador volta direto ao Painel
