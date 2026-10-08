## Context

Hoje `AppHeader` alterna entre `NarrowHeader` (até 640 px) e `WideHeader` (acima de 640 px). O primeiro oferece busca por ícone, tema, conta e abas em duas linhas; o segundo mostra campo de busca e ações textuais. `MobileFabs` e o espaço de segurança no fim da página também param em 640 px. Na estante, o modo Capas usa `auto-fill`, mas uma regra força uma única coluna até 640 px. O modo Lista é independente desse grid.

## Goals / Non-Goals

**Goals:**

- Compartilhar a mesma composição e os mesmos ícones de cabeçalho em celular e tablet, incluindo a faixa de 641 a 1024 px.
- Preservar o acesso a busca, tema, conta, navegação, registro de livro e sorteio em ambas as faixas.
- Mostrar exatamente duas colunas no modo Capas em larguras de celular, sem rolagem horizontal ou controles cortados, inclusive a 320 px.

**Non-Goals:**

- Alterar os fluxos de busca, sorteio, registro ou conta.
- Mudar o modo Lista, a quantidade de livros por página ou o grid em larguras acima de 640 px.

## Decisions

1. **Estender o cabeçalho compacto até 1024 px.** Trocar as condições de visibilidade de `NarrowHeader` e `WideHeader` no mesmo limite, mantendo só um cabeçalho visível. O padrão compacto já fornece marca, busca por ícone, tema, conta e abas; reaproveitá-lo evita uma terceira versão. O cabeçalho largo continua acima de 1024 px. Alternativa considerada: adaptar o cabeçalho largo para tablets; isso manteria estrutura e ícones diferentes dos celulares.
2. **Estender as ações flutuantes e seu espaço de segurança até 1024 px.** `MobileFabs` já concentra registrar e sortear quando o cabeçalho compacto está ativo. Usar o mesmo limite para os controles e para o espaço no fim da página evita ações ausentes ou cobertas no tablet. Preservar seus rótulos acessíveis, estado desabilitado e comportamento ao rolar. Alternativa considerada: duplicar essas ações dentro do cabeçalho compacto; isso apertaria a primeira linha no celular.
3. **Definir duas trilhas iguais no grid de capas até 640 px.** Usar duas colunas com mínimo de zero e reduzir o espaçamento horizontal nessa faixa para comportar as capas a 320 px. Fora dela, manter o preenchimento automático atual. Fazer os metadados e controles do `BookCard` quebrarem linha ou se ajustarem ao espaço disponível, sem diminuir o alvo de toque. Alternativa considerada: manter `auto-fill` no celular; ele pode voltar a uma coluna nas larguras menores.
4. **Verificar comportamento e geometria nos limites de largura.** Atualizar os testes que codificam uma coluna e cobrir 320, 390, 768, 1024 e 1025 px, incluindo ações e ausência de rolagem horizontal. Revisar snapshots visuais afetados somente após confirmar o novo layout.

## Risks / Trade-offs

- [Cards estreitos podem cortar metadados ou controles] → Permitir quebra dos controles, limitar a largura de textos longos e conferir a 320 px com livros de título e status variados.
- [Ações flutuantes podem cobrir conteúdo no tablet] → Aplicar o mesmo limite de largura ao espaço de segurança e verificar a parte final da página com rolagem.
- [Troca de breakpoint pode mostrar dois cabeçalhos ou nenhum] → Usar limites complementares e testar ambos os lados de 1024 px.

## Migration Plan

Alteração somente de interface, sem migração de dados. Aplicar os novos limites e o grid, executar testes responsivos e revisar capturas visuais. Uma reversão consiste em restaurar os limites e a classe do grid anteriores.

## Open Questions

Nenhuma bloqueante; o limite de tablet de 1024 px é a decisão adotada para esta mudança.
