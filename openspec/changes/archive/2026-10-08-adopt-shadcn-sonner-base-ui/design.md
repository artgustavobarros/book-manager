## Context

O toast era um módulo próprio (`components/app/toast.tsx`): store com `useSyncExternalStore`, um toast por vez, regiões `status`/`alert` sempre montadas e card desenhado conforme o design. O shadcn oferece o Sonner, e o usuário definiu que componentes shadcn têm prioridade, sem restilizar a raiz em `components/ui/`.

## Goals / Non-Goals

**Goals:**
- Usar o `ui/sonner.tsx` exatamente como a CLI gera.
- Manter o visual e a API do toast, sem tocar nos chamadores.
- Declarar Base UI como família padrão do shadcn.

**Non-Goals:**
- Migrar `dialog`, `alert-dialog` e `button` (Radix) para Base UI.
- Mover o `IconButton` e as variantes da Bodega para fora de `ui/button.tsx`.

## Decisions

- **Estilo no ponto de uso, com `unstyled`.** O `<Toaster>` de `components/app/toast.tsx` passa `toastOptions.unstyled` e `classNames` com os tokens da Bodega. Os seletores visuais do Sonner só valem com `data-styled="true"`, então nada do visual padrão vaza. Alternativa descartada: editar o `ui/sonner.tsx`, que viola a convenção.
- **Um por vez via `dismiss()` + `visibleToasts={1}`.** Cada `toast()` dispensa o anterior antes de criar o novo, como a store antiga fazia.
- **Barra de tempo no `::after`.** A duração vai por toast na variável `--toast-ms` e a cor por tipo (`classNames.success` etc.). A barra pausa com `data-expanded=true`, quando o Sonner também pausa o timer.
- **`useToastVisible` com `useSonner()`.** O Sonner avisa a store quando um toast fecha pelo tempo (`removeToast` → `ToastState.dismiss`), então os botões flutuantes continuam visíveis enquanto há toast.
- **Largura mobile com `!important`.** O CSS do Sonner é injetado fora das `@layer` e supõe offsets simétricos no mobile (`width: calc(100% - left*2)`). A classe `max-[600px]:w-[calc(100%-left-right)]!` respeita o offset direito de 88px, que deixa espaço para os botões flutuantes.
- **`theme` do Sonner não é passado.** O `next-themes` não tem provider aqui, então o Sonner cai em `system`. Como o visual vem todo dos tokens (que seguem o `data-theme`), o tema do Sonner não afeta nada.

## Risks / Trade-offs

- [Erros deixam de ser `alert`] → o Sonner tem uma única região `aria-live="polite"`. Leitores de tela ainda anunciam o erro, sem interromper. Aceito em troca de usar o componente padrão.
- [Breakpoint 600px, não 640px] → entre 601px e 640px o toast fica centralizado com 440px. A 601px a borda direita fica em ~520px e os botões flutuantes começam em ~529px, então não há sobreposição.
- [Dependências a mais] → `next-themes` e `lucide-react` entram só porque o `ui/sonner.tsx` gerado os importa.
