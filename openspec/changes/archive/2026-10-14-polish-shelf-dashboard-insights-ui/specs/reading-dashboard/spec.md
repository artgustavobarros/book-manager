## MODIFIED Requirements

### Requirement: Cabeçalho do Painel
O Painel SHALL mostrar a data de hoje por extenso em pt-BR (dia da semana capitalizado) e a saudação conforme o horário local ("Bom dia" antes de 12h, "Boa tarde" antes de 18h, "Boa noite" depois), seguida do primeiro nome do usuário. A data MUST vir antes da saudação, numa linha própria acima dela e alinhada à direita, no estilo do subtítulo do card "Meta de leitura" (`text-base` na cor `--mute`); a saudação fica logo abaixo, à esquerda.

#### Scenario: Saudação vespertina
- **WHEN** o usuário "Ana Lima" abre o Painel às 15h
- **THEN** o título mostra "Boa tarde, Ana"

#### Scenario: Data à direita
- **WHEN** o usuário abre o Painel a 1440px numa segunda-feira, 15 de junho
- **THEN** "Segunda-feira, 15 de junho" aparece à direita, acima de "Boa tarde, Ana", no tamanho e cor de "de 24 livros lidos", e a saudação fica à esquerda logo abaixo

## ADDED Requirements

### Requirement: Hover dos botões de ação do Painel
Os botões de ação compactos do Painel ("Terminei" em "Lendo agora", "Ler" em "Últimos adicionados" e "Devolver" no detalhamento de empréstimos) SHALL compartilhar o mesmo estilo: contorno de linha, fundo de cartão e texto na tinta do tema em repouso; no hover e no foco visível, a borda e o texto MUST passar para a cor de acento do projeto (`--acc`), com transição de 200 ms em cor e borda.

#### Scenario: Hover em Terminei
- **WHEN** o usuário passa o mouse sobre "Terminei" num livro de "Lendo agora"
- **THEN** a borda e o texto do botão mudam para a cor de acento em uma transição de 200 ms

#### Scenario: Mesmo estilo nos três botões
- **WHEN** o usuário passa o mouse sobre "Ler" em "Últimos adicionados" ou sobre "Devolver" em "Livros emprestados"
- **THEN** o botão reage com a mesma borda e texto de acento e a mesma duração de "Terminei"

### Requirement: Tipografia dos KPIs do Painel
Os KPIs do Painel (Livros no acervo, Lidos, Páginas lidas, Emprestados e Autores) SHALL usar a mesma tipografia e as mesmas cores do card "Meta de leitura": título em `font-semibold text-base` na tinta do tema, número em `font-title` negrito `text-5xl` e subtítulo (por exemplo "+3 adquiridos em 2026") no estilo de "de 24 livros lidos": `text-base` na cor `--mute`, logo abaixo do número. O espaçamento interno MUST ser o mesmo da meta (24px nas laterais e 20px em cima e embaixo). O atalho "Ver lista →" do KPI de Emprestados MUST continuar na cor de acento.

#### Scenario: KPI no mesmo padrão da meta
- **WHEN** o usuário abre o Painel
- **THEN** o título "Lidos" tem o mesmo tamanho, peso e cor de "Meta de leitura 2026", o número "16" tem o tamanho do número de livros lidos da meta e "53% do acervo" tem o tamanho e a cor de "de 24 livros lidos"
