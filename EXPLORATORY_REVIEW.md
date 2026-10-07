# Relatório de Exploração, Auditoria e Personas — Bodega Literária

Este documento consolida as descobertas da sessão exploratória, o mapeamento de comportamentos e fricções das **Personas de Teste Operacional**, os erros/bugs identificados e o protocolo acordado para implementação e abertura de Pull Requests.

---

## 1. Protocolo de Implementação e Fluxo de Trabalho (Regras Obrigatórias)

1. **Confirmação Prévia de Proposta Ativa:**
   - Antes de iniciar a implementação (`/openspec-apply-change`), o assistente e o usuário devem confirmar qual proposta está sendo executada.
2. **Proibido Commits Diretos na `main`:**
   - Toda e qualquer implementação deve ocorrer em uma branch isolada cujo nome é exatamente o nome da proposta:
     ```bash
     git checkout -b <nome-da-proposta>
     ```
3. **Submissão via Pull Request:**
   - Ao concluir as tarefas e os testes da proposta, as alterações devem ser enviadas e submetidas via PR.
4. **Registro Contínuo de Achados (Este Documento):**
   - Qualquer erro, inconsistência ou ponto de melhoria identificado durante as auditorias e implementações deve ser registrado aqui com:
     * O que precisa mudar
     * Como reproduzir
     * Critérios de aceitabilidade

---

## 2. Mapa das 4 Propostas Criadas no OpenSpec

As 4 propostas foram criadas no sistema OpenSpec (`openspec/changes/`) na ordem de prioridade definida:

| Ordem | Proposta / Branch | Foco Principal | Status do Planejamento |
|---|---|---|---|
| **1ª** | `quick-book-status-actions` | Ações rápidas de status (1 clique nos cards/lista/painel) | Pronto para aplicar (4/4 artefatos) |
| **2ª** | `book-lending-management` | Gestão e devolução de empréstimos + alerta de tempo no Painel | Pronto para aplicar (4/4 artefatos) |
| **3ª** | `mobile-shelf-experience` | Touch targets (44px), auto-foco na busca e teclado nos modais | Pronto para aplicar (4/4 artefatos) |
| **4ª** | `stress-test-fixtures` | Seeds no banco com perfis de personas (ex: 600 livros) + teste E2E | Pronto para aplicar (4/4 artefatos) |

---

## 3. Matriz de Erros, Fricções e Achados da Auditoria

### Item 1: Atrito no Ciclo de Troca de Status de Leitura
* **Persona Afetada:** Thiago (Metas) e Arthur (Colecionador).
* **O que precisa mudar:**
  * O card da Estante e a linha da tabela exigem abrir um `<select>` nativo ou abrir a ficha modal para transições comuns (ex: passar de "Quero ler" para "Lendo" ou "Lido").
  * No Painel, não existe atalho direto para reverter uma leitura marcada acidentalmente no ano corrente.
* **Como reproduzir:**
  1. Acessar `/estante` no desktop ou mobile.
  2. Localizar um livro com status "Quero ler".
  3. Observar que para colocá-lo em "Lendo", é necessário clicar no select e acionar o menu do sistema operacional ou abrir o modal de detalhes.
* **Critérios de Aceitabilidade:**
  - Botão de ação rápida no card e na linha permite alternar status em 1 clique/toque.
  - Atualização é otimista com feedback tátil e possibilidade de desfazer.
  - No Painel, itens de "Lidos no ano" possuem ação de desfazer.

---

### Item 2: Falta de Controle de Tempo e Devolução Rápida de Empréstimos
* **Persona Afetada:** Mariana (Gestão de Empréstimos).
* **O que precisa mudar:**
  * Quando um livro está emprestado, o Painel apenas soma um contador genérico ("N fora de casa agora"). Não informa com quem está nem há quanto tempo.
  * Para devolver um livro, o usuário precisa clicar no livro, abrir o modal de edição completo, apagar manualmente o texto do campo "Emprestado para" e salvar.
* **Como reproduzir:**
  1. Cadastrar um livro com status `emprestado` e pessoa `Carlos`.
  2. Acessar `/` (Painel): o KPI mostra "1 fora de casa agora", mas clicar nele não exibe a lista de quem pegou.
  3. Acessar `/estante`: para devolver, é necessário abrir a edição completa da ficha.
* **Critérios de Aceitabilidade:**
  - Clicar no KPI de Emprestados exibe detalhamento (livro, nome da pessoa, tempo decorrido ex: "há 45 dias").
  - Botão "Registrar devolução" em 1 clique devolve o livro e limpa o contato de forma atômica.
  - Filtro direto "Emprestados" acessível na Estante.

---

### Item 3: Alvos de Toque Pequenos e Interferência do Teclado Virtual no Mobile
* **Persona Afetada:** Camila (Mobile no sebo) e Dona Lúcia (Acessibilidade/Zoom).
* **O que precisa mudar:**
  * Em telas estreitas (390px), alguns botões de ação e paginação têm altura inferior aos 44px recomendados pela WCAG.
  * O botão de busca no header exige tocar para abrir e um segundo toque para focar o input.
  * Em formulários modais de cadastro de livro, ao abrir o teclado virtual, os botões inferiores "Salvar" e "Cancelar" podem ficar inacessíveis sem rolagem manual forçada.
* **Como reproduzir:**
  1. Abrir o DevTools em emulação mobile (390×844) com throttle de CPU/rede.
  2. Tocar no ícone de busca: o campo expande, mas o cursor não ganha foco automaticamente.
  3. Abrir "+ Registrar livro": focar no campo inferior de "Anotações"; verificar como o modal se comporta com teclado virtual ativo.
* **Critérios de Aceitabilidade:**
  - Ao expandir a busca no mobile, foco é atribuído imediatamente ao input.
  - Todos os elementos clicáveis no mobile possuem área efetiva de toque de no mínimo 44×44px.
  - O rodapé do modal de livro utiliza unidades dinâmicas (`dvh`) ou fixação para manter o botão "Salvar" acessível.

---

### Item 4: Ausência de Massa de Dados Realista para Testes de Performance
* **Persona Afetada:** Arthur (Power User / 600 livros).
* **O que precisa mudar:**
  * O comando `pnpm db:seed` popula apenas 30 livros de exemplo.
  * Isso mascara eventuais gargalos de renderização, estouro de memória no DOM ou lentidão na busca e ordenação quando o acervo cresce.
* **Como reproduzir:**
  1. Rodar `pnpm db:seed`.
  2. Acessar a aplicação: com apenas 30 livros, qualquer renderização parecerá instantânea, impossibilitando medir métricas de estresse reais.
* **Critérios de Aceitabilidade:**
  - Existência do comando `pnpm db:seed:personas`.
  - Geração de perfis determinísticos (`arthur.whale`, `mariana.emprestimos`, `lucas.metas`, `zero.novato`).
  - Teste de carga no Playwright validando tempo de resposta aceitável na Estante com 500+ livros.
