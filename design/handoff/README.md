# Bodega Literária — pacote para desenvolvimento

Catálogo pessoal de livros físicos: Painel (indicadores, meta, leituras), Estante (capas/lista, busca, filtros, ordenação) e Dados do acervo (gráficos). Login/cadastro e Minha conta são apenas visuais.

## Conteúdo

- `Bodega Literária.html` — app completo, arquivo único, abre offline no navegador.
- `Bodega Literária – Design System.html` — referência visual: cores, tipografia, espaço, movimento, componentes e microinterações (interativo, tema claro/escuro).
- `styles.css` — ponto de entrada dos tokens (só `@import`).
- `tokens/colors.css` — paleta clara em `:root`, escura em `:root[data-theme="dark"]`, status e aliases semânticos.
- `tokens/typography.css` — Hanken Grotesk (Google Fonts) e escala Tailwind (`--text-xs` 12px … `--text-5xl` 48px), pesos e tracking.
- `tokens/spacing.css` — espaçamento base 4px, alturas de controle, raios, sombras, container 1440px, breakpoint 640px.
- `tokens/motion.css` — durações Tailwind, curvas e todos os `@keyframes` do app.
- `source/` — código-fonte dos dois arquivos (abra com `support.js` na mesma pasta).

## Equivalência com Tailwind

- Espaço: `p-4` = 16px, `gap-3` = 12px, `h-10` = 40px (botões), `h-8` = 32px (chips), `h-11` = 44px (CTA).
- Texto: `text-xs` 12/16 · `text-sm` 14/20 (corpo de UI) · `text-base` 16/24 · `text-lg` 18/28 · `text-xl` 20/28 · `text-3xl` 30/36 (H1) · `text-5xl` 48.
- Raios: `rounded-lg` 8px (controles) · `rounded-xl` 12px (cards, modais) · `rounded-2xl` 16px (popover) · `rounded-full` (pílulas).
- Duração: `duration-150` hover/pressão · `200` véu, chips · `300` modal, toast, tema · `500` entradas, carrossel · `700` gráficos.
- Curva enfática para entradas: `cubic-bezier(.2,.7,.2,1)`.

## Dados e integrações

- Armazenamento em `localStorage`: `acervo-livros-v1` (livros), `acervo-meta-anual`, `acervo-tema`, `acervo-planilha-url`, `acervo-usuario`. Sessão em `sessionStorage` (`acervo-sessao`).
- Capas: Google Books, Apple Books (iTunes Search), Open Library e Amazon (via busca).
- Sincronização: link público do Google Sheets → CSV. Cabeçalhos reconhecidos: ORDEM, TÍTULO, STATUS, AUTOR(ES), EDITORA, PAÍS/NACIONALIDADE, GÊNERO (detecta automaticamente se é gênero do autor), EMPRESTADO, PÁGINAS, ANO, AQUISIÇÃO, ANOTAÇÕES.
- Exportação CSV (`;`, UTF-8 com BOM) e backup/restauração em JSON.

## A fazer em produção

- Autenticação real (login, cadastro, Google, troca de senha) e armazenamento no servidor.
- Campo Cor/etnia do autor (existe na planilha, ainda não no app).
