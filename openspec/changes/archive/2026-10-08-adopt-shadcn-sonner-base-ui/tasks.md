## 1. Base UI como padrão

- [x] 1.1 Trocar `style` do `components.json` de `radix-nova` para `base-nova`

## 2. Sonner

- [x] 2.1 Instalar o Sonner com `shadcn add sonner` (gera `components/ui/sonner.tsx`, sem alterações além da formatação) e adicionar `lucide-react`, que o arquivo importa
- [x] 2.2 Reescrever `components/app/toast.tsx` sobre o Sonner mantendo `toast()`, `useToastVisible` e `<Toaster pendingVerification>`: um por vez, durações por tipo/nota, nota de cadastro pendente
- [x] 2.3 Estilizar no ponto de uso (`unstyled` + `classNames`): card, ícone por tipo, título, nota, botão "Fechar notificação", barra de tempo no `::after` com pausa no hover, `font-sans`
- [x] 2.4 Posicionar: centralizado a 28px do rodapé com até 440px no desktop; no mobile, offsets 16/16/88px sem cobrir os botões flutuantes

## 3. Testes e registro

- [x] 3.1 Atualizar `tests/e2e/books.spec.ts` para a região viva "Notificações"
- [x] 3.2 Rodar `pnpm lint`, `pnpm typecheck` e `pnpm test`
- [x] 3.3 Rodar os e2e do toast e os testes visuais `toast de sucesso`/`toast de erro` (desktop e mobile)
- [x] 3.4 Registrar no `EXPLORATORY_REVIEW.md` o que ficou fora do escopo
