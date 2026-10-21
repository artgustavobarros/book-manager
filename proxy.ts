import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const AUTH_PAGES = [
  "/entrar",
  "/verifique-email",
  "/esqueci-senha",
  "/redefinir-senha",
];

/** Estante pública (`/estante/{slug}`): aberta a visitantes; `/estante` continua protegida. */
const PUBLIC_SHELF = /^\/estante\/[^/]+\/?$/;

/** Caminhos que não exigem sessão (além dos excluídos pelo matcher). */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_SHELF.test(pathname);
}

/**
 * Redirecionamento otimista (só olha se existe o cookie de sessão): visitantes sem
 * cookie vão para /entrar. A validação real acontece no layout do app e em cada
 * Route Handler; quem já está logado e abre uma página de auth é redirecionado lá.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }
  if (!getSessionCookie(request)) {
    const url = new URL("/entrar", request.url);
    if (pathname !== "/") {
      url.searchParams.set("voltar", pathname + search);
    }
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Tudo menos API, arquivos do Next, arquivos estáticos e as imagens de metadados
  // geradas (sem extensão no caminho, inclusive as OG das estantes públicas em /og/),
  // que robôs de preview buscam sem cookie.
  matcher: [
    "/((?!api|og/|_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
