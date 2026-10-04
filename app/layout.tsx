import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";

import { appUrl } from "@/lib/app-url";
import { SITE_DESCRIPTION, SITE_NAME, THEME_COLOR } from "@/lib/site";
import { parseTheme, THEME_COOKIE, TZ_COOKIE } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: SITE_NAME, template: "%s · " + SITE_NAME },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "pt_BR",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

/** Cor da barra do navegador no tema salvo (o botão de tema atualiza a meta no cliente). */
export async function generateViewport(): Promise<Viewport> {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return { themeColor: THEME_COLOR[theme] };
}

// Guarda o fuso do navegador num cookie para o servidor calcular data/saudação certas.
const tzScript = `try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z&&document.cookie.indexOf("${TZ_COOKIE}="+encodeURIComponent(z))<0)document.cookie="${TZ_COOKIE}="+encodeURIComponent(z)+";path=/;max-age=31536000;samesite=lax"}catch(e){}`;

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html data-theme={theme} lang="pt-BR" style={{ colorScheme: theme }}>
      <head>
        <link
          as="font"
          crossOrigin=""
          href="/fonts/hanken-grotesk/latin.woff2"
          rel="preload"
          type="font/woff2"
        />
      </head>
      <body>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: The script only writes the browser time zone to a cookie. */}
        <script dangerouslySetInnerHTML={{ __html: tzScript }} />
        {children}
      </body>
    </html>
  );
}
