import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";

import { env } from "@/env";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail, type EmailMessage } from "@/lib/email";
import { resetPasswordEmail, verificationEmail } from "@/lib/email/templates";
import { MIN_PASSWORD } from "@/lib/validation/auth";

/**
 * Envia sem bloquear a resposta (evita revelar por tempo de resposta se a conta existe).
 * Falhas ficam no log do servidor; as telas sempre oferecem "Reenviar".
 */
function deliver(message: EmailMessage) {
  waitUntil(
    sendEmail(message).catch((error) => {
      console.error("[email] falha ao enviar", message.subject, error);
    }),
  );
}

export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);

const vercelUrl = env.VERCEL_URL ? `https://${env.VERCEL_URL}` : undefined;

/** Produção: BETTER_AUTH_URL. Previews da Vercel: a URL do próprio deploy. */
export const appUrl = env.BETTER_AUTH_URL ?? vercelUrl ?? "http://localhost:3000";

const trustedOrigins = [appUrl, env.NEXT_PUBLIC_APP_URL, vercelUrl].filter((o): o is string => !!o);

export const auth = betterAuth({
  appName: "Bodega Literária",
  baseURL: appUrl,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: MIN_PASSWORD,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => deliver(resetPasswordEmail(user.email, url)),
    // Redefinir a senha pelo link do e-mail prova a posse da caixa: a conta fica verificada.
    onPasswordReset: async ({ user }) => {
      if (!user.emailVerified) {
        await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, user.id));
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    // Também usado na troca de e-mail: o link vai para o endereço novo.
    sendVerificationEmail: async ({ user, url }) => deliver(verificationEmail(user.email, url)),
  },

  socialProviders: googleEnabled
    ? { google: { clientId: env.GOOGLE_CLIENT_ID!, clientSecret: env.GOOGLE_CLIENT_SECRET!, prompt: "select_account" } }
    : {},

  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      // O Google só se vincula implicitamente a contas locais com e-mail verificado.
      requireLocalEmailVerified: true,
      // Vincular explicitamente (estando logado) pode usar outro endereço Google.
      allowDifferentEmails: true,
    },
  },

  user: {
    changeEmail: { enabled: true },
    deleteUser: { enabled: true },
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 10 },
      "/delete-user": { window: 60, max: 5 },
    },
  },

  // Precisa ser o último plugin: grava os cookies em Server Actions/Route Handlers.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
