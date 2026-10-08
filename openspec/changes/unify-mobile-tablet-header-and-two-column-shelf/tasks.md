## 1. Cabeçalho responsivo

- [x] 1.1 Ler o guia relevante de componentes cliente e navegação em `node_modules/next/dist/docs/` antes de editar o código, conforme `AGENTS.md`.
- [x] 1.2 Aplicar o limite complementar de 1024 px aos cabeçalhos compacto e largo; verificar marca, abas, busca, tema e conta em celular e tablet.
- [x] 1.3 Disponibilizar os controles flutuantes de registro e sorteio até 1024 px e estender o espaço de segurança no fim da página para a mesma faixa.

## 2. Estante em duas colunas

- [x] 2.1 Configurar o modo Capas com duas colunas de mesma largura até 640 px, preservando o grid atual acima desse limite e o modo Lista.
- [x] 2.2 Ajustar espaçamento, textos e controles dos cards para caber em duas colunas a 320 px sem rolagem horizontal, corte ou perda de alvo de toque.

## 3. Verificação

- [x] 3.1 Atualizar os testes que assumem uma coluna no celular e cobrir grid, ações dos cards e ausência de rolagem horizontal a 320 e 390 px.
- [x] 3.2 Cobrir cabeçalho e ações flutuantes a 390, 768, 1024 e 1025 px, incluindo busca com foco, sorteio desabilitado e conteúdo final acessível.
- [x] 3.3 Executar lint, typecheck e os testes de interface afetados; revisar e atualizar capturas visuais alteradas pelo novo layout.
