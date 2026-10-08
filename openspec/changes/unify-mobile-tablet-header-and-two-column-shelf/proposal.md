## Why

O cabeçalho muda de estrutura e de ações ao passar de 640 px, então a navegação no tablet parece diferente da experiência no celular. Na estante, a visualização de capas usa apenas uma coluna no celular e aproveita pouco a largura disponível.

## What Changes

- Usar o mesmo cabeçalho compacto no celular e no tablet, até 1024 px, com a mesma marca, navegação e os mesmos ícones de busca, tema e conta.
- Manter as ações de registrar livro e sortear um livro disponíveis em ambas as faixas por meio dos controles flutuantes já usados no celular.
- Exibir a visualização de capas da estante em duas colunas no celular, inclusive nas larguras estreitas; preservar o modo Lista e os comportamentos de busca, filtros e paginação.
- Ajustar o espaço e os controles dos cards para que duas colunas não causem corte, sobreposição ou rolagem horizontal.

## Capabilities

### New Capabilities

- `app-shell`: comportamento responsivo do cabeçalho e disponibilidade das ações de navegação no celular e no tablet.
- `shelf-browsing`: disposição responsiva da visualização de capas da estante.

### Modified Capabilities

Nenhuma. A `origin/main` ainda não contém especificações dessas duas capacidades.

## Impact

- Componentes do cabeçalho, dos botões flutuantes e do contêiner da aplicação em `components/app/`.
- Grid da estante e, se necessário para caber em duas colunas, controles dos cards em `components/estante/` e `components/books/`.
- Testes de interface existentes que assumem uma coluna no celular ou um cabeçalho largo no tablet. Sem alteração de API ou dependências.
