import type { Metadata } from "next";
import { cookies } from "next/headers";

import { THEME_COOKIE, TZ_COOKIE, parseTheme } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: "Bodega Literária",
  description: "Catálogo pessoal dos livros de casa.",
};

// Guarda o fuso do navegador num cookie para o servidor calcular data/saudação certas.
const tzScript = `try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z&&document.cookie.indexOf("${TZ_COOKIE}="+encodeURIComponent(z))<0)document.cookie="${TZ_COOKIE}="+encodeURIComponent(z)+";path=/;max-age=31536000;samesite=lax"}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="pt-BR" data-theme={theme} style={{ colorScheme: theme }}>
      <head>
        <link rel="preload" href="/fonts/hanken-grotesk/latin.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: tzScript }} />
        {children}
      </body>
    </html>
  );
}
