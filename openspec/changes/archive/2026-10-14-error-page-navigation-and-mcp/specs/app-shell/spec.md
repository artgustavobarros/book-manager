## ADDED Requirements

### Requirement: Tela de erro e recuperação
A tela de erro inesperado do aplicativo (`app/error.tsx`) SHALL exibir a moldura `StatusScreen` com o título "Algo deu errado", mensagem explicativa contendo o código de digest quando disponível, o botão primário "Tentar de novo" e a ação "Voltar ao Painel". O botão "Tentar de novo" MUST acionar a função `retry()` do Next.js para tentar re-renderizar o segmento com erro. A ação "Voltar ao Painel" MUST utilizar navegação nativa do navegador (`<a>` com `href="/"`) para garantir que uma requisição HTTP completa seja disparada ao servidor, permitindo recarregar o acervo mesmo se o erro tiver ocorrido durante a renderização da rota raiz (`/`).

#### Scenario: Tentar de novo na tela de erro
- **WHEN** ocorre um erro de renderização e o usuário clica em "Tentar de novo"
- **THEN** o aplicativo executa a função de retry do Next.js para tentar re-renderizar o segmento

#### Scenario: Voltar ao Painel com erro na Home
- **WHEN** o usuário está na rota `/` e a tela de erro é exibida
- **THEN** clicar em "Voltar ao Painel" dispara uma navegação completa do navegador para `/`, recarregando a página e os dados do servidor
