## 1. Diagnóstico dos gêneros

- [ ] 1.1 Conferir no banco de produção (somente leitura) quantos livros `nao-lido` têm `genre` preenchido e quantos gêneros distintos existem; registrar o resultado na change.
- [ ] 1.2 Se os livros estiverem sem gênero, rastrear a origem (importação de planilha em `lib/domain/sheet.ts`, lookup em `lib/domain/lookup.ts` ou cadastro manual) e corrigir o mapeamento se houver defeito; se `surpriseGenres` estiver errado, corrigir e cobrir em `lib/domain/surprise.test.ts`.

## 2. Componente combobox

- [x] 2.1 Rodar `pnpm dlx shadcn@latest add combobox` recusando a sobrescrita de `components/ui/button.tsx`; conferir `components/ui/combobox.tsx`, `components/ui/input-group.tsx` e a entrada de `@base-ui/react` no `package.json`.
- [x] 2.2 Ajustar o `combobox.tsx`/`input-group.tsx` às variantes do `Button` local (sem alterar o `Button`), trocar os ícones `lucide` por SVGs inline e remover `lucide-react` caso o CLI o tenha instalado.
- [x] 2.3 Fazer `ComboboxContent` aceitar um `container` para o portal e garantir que o Esc com a lista aberta não feche o `Dialog` do Radix.

## 3. Modal "Me surpreenda"

- [x] 3.1 Substituir o `<select>` em `components/app/surprise-modal.tsx` pelo combobox: valor `GenreOption`, rótulo com contagem, filtro com `norm`, "Nenhum gênero encontrado." como estado vazio e novo sorteio ao escolher.
- [x] 3.2 Passar o painel do modal como `container` do portal e manter o rótulo acessível "Sortear entre" associado ao input.
- [x] 3.3 Mostrar a dica "Cadastre o gênero na ficha dos livros para sortear por gênero." quando só existir a opção "Todos os gêneros" e houver livros não lidos.
- [x] 3.4 Aplicar o visual do app ao campo e à lista (altura de 36px, `border-line2`, `bg-card`, `text-ink`, destaque `bg-hov`) e conferir o layout a 390px.

## 4. Verificação

- [x] 4.1 Adicionar e2e cobrindo: escolher um gênero por clique, digitar "ficcao" e filtrar, busca sem resultado, Esc fechando só a lista e sair do campo sem escolher.
- [x] 4.2 Atualizar os casos visuais do modal em `tests/support/visual-cases.ts` (lista aberta, desktop e mobile) e regenerar as referências afetadas.
- [x] 4.3 Rodar `pnpm lint`, `pnpm typecheck`, `pnpm test` e os e2e afetados.
