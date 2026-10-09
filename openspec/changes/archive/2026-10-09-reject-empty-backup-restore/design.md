## Context

A restauração substitui o acervo inteiro numa transação (`replaceBooks`). A validação de conteúdo fica em `fromBackup` (domínio, puro), e o `importSchema` só checa forma e tamanho.

## Goals / Non-Goals

**Goals:** impedir que um arquivo sem livros válidos apague o acervo; deixar claro na confirmação o que será restaurado.

**Non-Goals:** limites de tamanho dos campos importados (BP-11) e testes de isolamento (BP-03), previstos para outras changes.

## Decisions

- **Regra no domínio, não na rota.** `fromBackup` lança `InvalidBackupError` quando sobra zero livros. A rota já converte esse erro em 400, e o cliente reaproveita a mesma função antes de abrir a confirmação, então servidor e interface não divergem.
- **Sem limite percentual de aproveitamento.** O relatório sugeria rejeitar quando menos de 50% dos itens fossem válidos. Backups legítimos podem ter linhas vazias, e um corte arbitrário bloquearia restaurações válidas. Em vez disso, a confirmação mostra "N livros (M itens ignorados)" e o usuário decide.
- **Cliente envia o arquivo bruto.** A contagem no cliente é só para a confirmação; o servidor revalida tudo.

## Risks / Trade-offs

- Um backup legítimo de acervo vazio (`[]`) deixa de restaurar. É aceitável: esvaziar a estante não é caso de uso da restauração.
