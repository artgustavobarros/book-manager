import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = ["/entrar", "/verifique-email", "/esqueci-senha", "/redefinir-senha"];

/**
 * Redirecionamento otimista (só olha se existe o cookie de sessão): visitantes sem
 * cookie vão para /entrar. A validação real acontece no layout do app e em cada
 * Route Handler; quem já está logado e abre uma página de auth é redirecionado lá.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"))) return NextResponse.next();
  if (!getSessionCookie(request)) {
    const url = new URL("/entrar", request.url);
    if (pathname !== "/") url.searchParams.set("voltar", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Tudo menos API, arquivos do Next e arquivos estáticos.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)"],
};
