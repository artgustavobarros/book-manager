# Leitura e Situação no lugar de um status único

O livro tinha um só status (não lido, lendo, lido, emprestado, abandonado, doado), que misturava duas perguntas: o que a pessoa fez com o livro e onde ele está. Com isso, "lido e emprestado" só existia por um atalho (emprestado com ano lido), "lendo e emprestado" não existia, e filtros e gráficos pareciam excludentes. Decidimos separar o estado em dois campos, **Leitura** (não lido, lendo, lido, abandonado) e **Situação** (em casa, emprestado, doado), com qualquer combinação permitida.

## Considered Options

- **Labels livres** (marcar "lido", "emprestado"… à vontade): descartadas porque permitem combinações contraditórias, como "lido" e "não lido" juntos.
- **Filtro especial "emprestado e lido"** sobre o status único: resolvia só o atalho de Dados e deixava o modelo confuso.

## Consequences

- Planilhas antigas têm uma coluna "Status" com valores das duas dimensões. A importação continua lendo "Status" como Leitura e trata "Emprestado"/"Doado" nessa coluna, ou "Emprestado para" preenchido, como Situação. A exportação passa a escrever "Leitura" e "Situação".
- Na migração, emprestados e doados ganham Leitura "Lido" se têm ano de leitura e "Não lido" se não têm.
- Lido passa a valer por Leitura, qualquer que seja a Situação: um doado lido conta nos lidos.
- A estante pública mostra só a Leitura; a Situação (inclusive emprestado) nunca é pública.
- Os parâmetros de URL passam a `?leitura=` e `?situacao=`; links com `?status=` deixam de filtrar.
