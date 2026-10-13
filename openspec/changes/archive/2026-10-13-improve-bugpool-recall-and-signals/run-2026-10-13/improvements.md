# Melhorias propostas para a skill bugpool (v3.0.1)

Base: rodada `/bugpool --local --dry-run --base c5246d7` (HEAD 28021b9), 7 agentes da skill, ~430k tokens de subagentes, ~6 min.
Autor: Observador A, com o Observador B (cético). Itens marcados [DISCORDÂNCIA] tiveram posições diferentes; [NÃO FECHADO COM B] não foram discutidos até o fim.
Caminhos relativos a `.agents/skills/bugpool/`.

## P0

### P0-1. Pré-passe determinístico quanto a flake e a testes de integração
- **Observado:** `prepass.md` marcou "related unit tests: fail" por 5 suítes de integração com `Hook timed out 10000ms` em `setupTestDb` (cold start do pglite); 57 testes ficaram skipped. O orquestrador improvisou um re-run (57/57 verdes) e uma nota em prosa para as lentes; o router errou onde estava essa nota (disse title-body.txt, estava no prepass.md). `correctness-stack.md:9` trata teste falhando como "strong evidence of a regression"; `lib.sh:62-69` (`run_related_tests`) não distingue infra de asserção e `prepass.sh` só mostra a cauda de 150 linhas.
- **Mudança:** em `scripts/prepass.sh`/`lib.sh`: (a) reexecutar UMA vez apenas as suítes que falharam com "Hook timed out" (nunca falha de asserção, para não mascarar flake de concorrência real, ressalva do B); (b) rótulos `ok` / `ok (flaky: passou no retry)` / `inconclusive (env)` / `fail`; (c) sempre imprimir passed/failed/skipped; (d) gravar isso no próprio prepass.md. Em `correctness-stack.md`/`qa.md`: "inconclusive" não é evidência de regressão. Em `report-templates.md`: linha "não verificado" quando suítes ficarem inconclusivas.
- **Informativo (sem gatilho automático da lente qa):** listar arquivos alterados sem teste relacionado (os .tsx).
- **Medir:** eval com uma suíte que estoura timeout na 1a execução (esperado: `flaky`, lentes sem pista falsa) e outra com asserção falhando (esperado: `fail`, sem retry).

### P0-2. Recall: bug real escondido como lacuna de teste e perdido por dedupe
- **Observado:** o defeito do `revertBookPatch`/`onMutate` (duas edições do mesmo campo, ambas falham, UI fica com valor nunca gravado) foi achado só pela lente qa, categoria `qa/missing-case`, apontando `book-cache.test.ts:19`. O validador o reproduziu (CONFIRMED MEDIUM). A `correctness-stack` (10 tool uses, "every changed hunk") não o viu e declarou BP-04 ok. A regra de dedupe do `SKILL.md` §5.1 usa `file` e linha ±3, então nunca juntaria o achado de teste com um achado no código.
- **Mudança:** (a) `lenses/qa.md`: quando o caso faltante demonstra defeito reproduzível, emitir categoria `bug`, no `file:line` do código-fonte, com severidade pela consequência (decisão acordada: os dois, categoria e arquivo do fonte). (b) `SKILL.md` §5.1: a chave de merge considera também os arquivos citados em `evidence`, sem fuzzy matching (B: não generalizar). (c) `lenses/correctness-stack.md`: bullet genérico de composição: "para estado otimista, fila, retry, undo ou cache local, simule duas operações A,B sobre o mesmo campo nos casos ok/ok, falha/ok, ok/falha, falha/falha e diga o estado final versus o servidor". As bullets atuais de "State and data" e "Concurrency" cobrem só uma transição ou uma corrida.
- **Medir:** novo eval de bug de composição (não esta seed; não ajustar a skill à seed) e checar que o achado aparece nos dois: lente de correção e qa, fundidos em um id.

### P0-3. Veredito e score ambíguos com LOW não validado e MEDIUM de integridade
[DISCORDÂNCIA de prioridade: B considera baixa prioridade, pois 91/A bate com `report-templates.md:5-8`; A mantém P0 só para a parte "definir se LOW não validado deduz" (resultado muda 91 vs 81 conforme a leitura) e aceita P2 para o rebaixamento do veredito.]
- **Observado:** `report-templates.md` diz que o score vale "over validated findings only"; com 5 LOW não validados o score seria 81 (B) ou 91 (A) conforme a leitura; o orquestrador escolheu 91. Um MEDIUM confirmado e reproduzido, com estado inconsistente visível ao usuário, terminou em "APPROVE WITH NITS, A".
- **Mudança:** em `report-templates.md` definir explicitamente se LOW não validado deduz (proposta: não deduz, mas é listado) e permitir o rebaixamento do grau/veredito quando houver MEDIUM CONFIRMED com repro (ex.: teto de nota B ou "APPROVE WITH NITS" exigir que nenhum MEDIUM reproduzido de perda/inconsistência de dados esteja aberto). [NÃO FECHADO COM B: o B não opinou sobre o rebaixamento; a parte "definir o tratamento do LOW" é inequívoca.]
- **Medir:** eval com um MEDIUM reproduzido: o veredito esperado deve ser o definido; mesma entrada dá sempre o mesmo score.

## P1

### P1-1. Severidade segue a consequência demonstrada (sem tetos por lente)
- **Observado:** `architecture.md` ("Max 4 findings, severity MEDIUM or lower") rebaixou a corrida DELETE fora da fila (`hooks/use-books.ts:79`) para LOW; F2 (falta teste, sem defeito) e F3 (regra duplicada sem divergência) saíram MEDIUM e o validador os rebaixou para LOW.
- **Mudança:** uma regra nas lentes qa/architecture: comportamento errado demonstrado = categoria `bug` e severidade real, sem teto; `qa/missing-test` e `architecture/duplicated-rule` sem defeito ou divergência concreta = teto LOW.
- **Medir:** proporção de findings rebaixados pelo validador (hoje 2/3).

### P1-2. Quais LOW vão ao validador e como cortar a 5
- **Observado:** `SKILL.md` §5.2 mantém 5 LOW sem critério (8 viraram 5 por escolha do orquestrador) e sem validação. [DISCORDÂNCIA parcial] A: validar todo LOW com cenário concreto. B: só LOW de categoria `bug`/comportamento, nunca LOW de teste ou estilo (L1 acabou real e baixo; validador só para confirmar um toast espúrio não compensa). Texto adotado: **validar LOW apenas de categoria bug/comportamento**. Reforço do B: L2 (`insights.ts:124` contra o filtro de `shelf.ts:196-197`, contagem diferente visível ao usuário) ficou "Not validated" por ser LOW.
- **Mudança:** §5.2: critério de ordenação (bug > consistência > missing-test > weak-assertion) e, no relatório, indicar quantos LOW foram descartados pelo corte.
- **Medir:** nenhum LOW de categoria `bug` fica sem validação.

### P1-3. Declaração de cobertura nas lentes
- **Observado:** `security` terminou "none" com 6 tool uses e disse ter lido só dados e entry points; `security.md` (Output) não tem campo para isso, então "none" é indistinguível de "não olhei". A correctness disse ter lido "every changed hunk" em 10 tool uses.
- **Mudança:** todas as lentes encerram com um `COVERAGE:` curto (arquivos/hunks lidos, o que foi ignorado de propósito), parseável; o relatório mostra "security: sem achados, cobriu X". O orquestrador pode re-disparar a área não lida.
- **Medir:** eval com bug semeado em arquivo que a lente teria de abrir; COVERAGE deve listá-lo.

### P1-4. Filtro genérico de ruído no diff
- **Observado:** 100 arquivos no diff, dos quais 57 são `openspec/*.md`, mais snapshot drizzle (1004 linhas), `skills-lock.json` e `EXPLORATORY_REVIEW.md` (adicionado e removido no intervalo). `SKILL.md` §1 grava `git diff base...HEAD` inteiro; prepass lista 99 arquivos incluindo isso.
- **Mudança:** em §1 e `prepass.sh`: pathspec de exclusão por padrão genérico (lockfiles, snapshots geradas, diretórios de docs/specs configuráveis; NÃO `**/*.md` em geral, pois prompts e skills são markdown, objeção do B aceita), configurável por flag/ambiente, e o diff filtrado alimenta router/lentes/validadores; arquivos excluídos aparecem como uma linha "ignorados: N". Não específico deste repo (B).
- **Medir:** tokens por lente antes/depois com o mesmo intervalo; nenhum achado perdido nos evals.

### P1-5. Oficializar a saída das lentes em arquivo
- **Observado:** o orquestrador pediu que cada lente gravasse `lens-<nome>.md` (desvio positivo). Hoje ~293k tokens de lentes voltam em mensagens.
- **Mudança:** `SKILL.md` §4: a lente escreve em `$RUN/lens-<nome>.md` e devolve caminho + contagem; o formato `STRUCTURED_FINDINGS` continua parseável e o orquestrador não relê texto livre (B).
- **Medir:** tokens no contexto do orquestrador por rodada.

## P2

### P2-1. Router: SCOPE_DRIFT e DANGER sem efeito em `--local` com intervalo
- **Observado:** SCOPE_DRIFT "none" porque title/body em `--local` é só o log de ~20 commits (`SKILL.md` §1), então tudo "mapeia a um commit". `DANGER` só aparece no relatório (`report-templates.md:22,49`); nenhum passo o consome. O router divergiu de "Output exactly" (bullet sob DANGER e `Note:`). As regras de lentes extras (`router.md:14`) são numéricas; `scope: full` nunca particiona; `architecture` dispara sempre quando >300 linhas.
- **Mudança:** (a) `--local` com vários commits: não reportar SCOPE_DRIFT (dizer "não aplicável") ou compará-lo com paths dos commits fix/feat; (b) ou DANGER passa a ter consumidor (ex.: subir o validador para opus em MEDIUM+ de danger HIGH), senão removê-lo do output; (c) validar o formato de saída do router. [B: o custo do router (1 haiku) não é problema; DANGER só vale como melhoria se alguém o usar; decidir `architecture` pelo rendimento, que foi plausível (F3 -> LOW após validação).]
- **Medir:** SCOPE_DRIFT espúrio em evals de intervalo; DANGER usado em pelo menos uma decisão ou removido.

### P2-2. Validador: repro permitido e veredito "parcialmente pré-existente"
- **Observado:** o validador (160s, 49k tokens, a etapa mais lenta e a de maior valor) escreveu e rodou um teste vitest descartável no scratchpad para provar o F1 (`validator.md` diz "Read-only"; ficou implícito). Para F3, 3 das 5 cópias já existiam em c5246d7, e `validator.md` só tem CONFIRMED/REJECTED/PRE-EXISTING.
- **Mudança:** `validator.md`: permitir explicitamente repro descartável só sob `$RUN`, nunca no repo; permitir `CONFIRMED (parcialmente pré-existente)` com a parcela introduzida.
- **Medir:** achados de lógica MEDIUM+ com repro anexo; precisão (CONFIRMED sem repro vs com).

### P2-3. Escala e cobertura da lente de correção
- **Observado:** 1 bug perdido pela correctness num diff de ~2,7k linhas de código; evidência fraca (B concorda) e pode ser lacuna do prompt (P0-2c), não tamanho.
- **Mudança:** nenhuma ainda. Medir: eval de recall em diff grande com e sem a lente dividida por área (client/concorrência vs domínio/serviços) antes de qualquer mudança no `SKILL.md`.

### P2-4. `--local --dry-run` para varrer intervalos grandes
- **Observado:** funciona, mas sem título/body real, sem filtro de ruído (P1-4), sem teto de LOW (P1-2) e sem COVERAGE (P1-3); cobre BP-03..BP-12 em 6 min / ~430k tokens. Triagem (6) e auto-fix (7) puladas corretamente.
- **Mudança:** nota no `SKILL.md` do modo intervalo: o orquestrador deve receber um resumo dos commits (subjects agrupados) como "intenção" e o relatório deve declarar o que não foi verificado (integração, e2e).

## Resumo da rodada
- Valor concentrado: qa (bug real + gap) e validador com repro. security: zero achados, sem cobertura declarada. correctness: 2 LOW cosméticos e 1 miss.
- Custo: lentes ~293k tokens, 86s; validador 160s; pré-passe 24s + 14s de re-run improvisado.

## Objeções do B
1. **P0-3 (rebaixar veredito/grau):** concordo com "LOW não validado não deduz, mas é listado" (definir no template). Discordo do teto de nota/veredito: "perda ou inconsistência de dados" é critério subjetivo e quebra o determinismo que o próprio item quer medir. Alternativa: manter a fórmula e exigir que a linha de veredito cite "N MEDIUM+ aberto(s), reproduzido(s)" e o primeiro bug. O score 91 (100-5-2-2) bate com `report-templates.md:5-8`; o problema é só apresentação. Rebaixar para P1.
2. **P1-1, métrica "proporção de findings rebaixados pelo validador (hoje 2/3)":** métrica ruim. O validador rebaixar F2/F3 é o comportamento projetado e funcionou; reduzir esse número incentiva lentes a emitir menos. Medir a calibração pela distância entre severidade da lente e consequência demonstrada em evals com gabarito, não pelo volume de rebaixamentos. A regra de teto LOW para missing-test/duplicated-rule sem divergência continua boa.
3. **P1-4 (excluir `**/*.md`):** genérico demais. Em repos com prompts/skills/AGENTS.md, markdown É código. Limitar a lockfiles, snapshots/migrações geradas, diretórios de docs configuráveis e arquivos adicionados-e-removidos no mesmo intervalo; e manter a linha "ignorados: N" com os globs. Também medir "nenhum achado perdido" num eval cujo bug esteja em .md de prompt.
4. **P0-2(b) (merge por arquivos citados em `evidence`):** aceito, mas a ordem importa: (a) categoria `bug` no file:line do fonte resolve a maior parte; (b) só se (a) não bastar nos evals. Evitar lógica de merge a mais no SKILL.md sem prova de necessidade.
5. **P2-2:** concordo, com ressalva: repro descartável fora do repo (`$RUN`), importando o código real por caminho absoluto; proibir qualquer escrita no repo e registrar o caminho do repro no veredito.
6. **P2-1:** concordo (DANGER ganha consumidor ou sai).
7. **Evals:** hoje medem recall de seeds em diffs pequenos e FP em limpo (scorecard.md). Não medem: validador (rejeita FP? confirma sem repro?), diff grande, bug de composição/estado, flake do pré-passe, calibração de severidade, nem o valor da lente architecture/qa. A "falha de custo" no gate (5.9x/4.5x/10.1x contra baseline, scorecard.md:25-31) nunca foi tratada: esta rodada (~430k tokens, 7 agentes) não mostra o custo marginal frente a um único sonnet com o mesmo diff; vale um A/B nesta mesma rodada antes de aceitar mais agentes/etapas. Recomendar que cada melhoria acima só entre com um eval correspondente e que o gate de custo seja explicitamente decidido (aceitar o custo, ou reduzir).

## Bugs que a rodada deixou passar
- Nenhum confirmado além dos já achados. O BUG-B1 (revertBookPatch/onMutate) foi pego pela qa e confirmado pelo validador, mas a correctness-stack o perdeu. Por amostragem, também li `lib/services/books.ts` (lentAtOnUpdate/lentAtOnInsert, replaceBooks, applyMerge), `lib/domain/backup.ts`, `lib/domain/sheet.ts` e `hooks/use-header-search.ts` sem achar defeito novo.
- Confirmo L2 por leitura direta, mas ele foi listado como LOW: `lib/domain/insights.ts:124` (`isRead`) vs `lib/domain/shelf.ts:196-197` e chip em `:217` (`b.status === status`). Cenário: livro emprestado com yearRead aparece em "lidos" no Painel/Dados e fora do chip "Lidos" da Estante. Validação de LOW de comportamento (P1-2) o teria confirmado.
- Limite do que verifiquei: não executei e2e nem as suítes de integração fora do pré-passe.
