## ADDED Requirements

### Requirement: Componentes shadcn-first
O projeto SHALL usar o componente do shadcn/ui sempre que existir um para o caso, em vez de elementos ou componentes feitos à mão. Os arquivos em `components/ui/` MUST ficar como a CLI do shadcn os gera (só formatação do Ultracite é permitida). O estilo da Bodega MUST ser aplicado no ponto de uso (`className`, `classNames` ou props). Um mesmo uso estilizado que se repete MUST virar um componente em `components/custom/`, que envolve o componente do shadcn. O `components.json` MUST usar um estilo Base UI (`base-*`), de modo que o `shadcn add` traga componentes em Base UI.

#### Scenario: Componente novo do shadcn
- **WHEN** uma tela precisa de um componente que o shadcn oferece
- **THEN** ele é adicionado com `shadcn add`, vem em Base UI e fica em `components/ui/` sem alterações de estilo

#### Scenario: Estilo repetido
- **WHEN** o mesmo componente do shadcn é usado com o mesmo estilo em mais de um lugar
- **THEN** esse uso vira um componente em `components/custom/` que envolve o componente de `components/ui/`
