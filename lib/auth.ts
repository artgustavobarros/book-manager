import { waitUntil } from "@vercel/functions";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { and, eq, ne } from "drizzle-orm";

import { env } from "@/env";
import { appUrl, vercelUrl } from "@/lib/app-url";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { type EmailMessage, sendEmail } from "@/lib/email";
import { resetPasswordEmail, verificationMessage } from "@/lib/email/templates";
import { syncGoogleAvatar } from "@/lib/services/google-avatar";
import { MIN_PASSWORD } from "@/lib/validation/auth";

/**
 * Envia sem bloquear a resposta (evita revelar por tempo de resposta se a conta existe).
 * Falhas ficam no log do servidor; as telas sempre oferecem "Reenviar".
 */
function deliver(message: EmailMessage) {
  waitUntil(
    sendEmail(message).catch((error) => {
      console.error("[email] falha ao enviar", message.subject, error);
    })
  );
}

export const googleEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
);
const e2eMode =
  env.E2E_MODE === "1" && env.DATABASE_URL.startsWith("pglite://");

const trustedOrigins = [appUrl, env.NEXT_PUBLIC_APP_URL, vercelUrl].filter(
  (o): o is string => !!o
);

/**
 * Remove vínculos sociais criados antes de alguém provar a posse do endereço.
 *
 * Quem cadastra um e-mail que não é seu recebe sessão na hora
 * (`requireEmailVerification: false`) e podia usá-la para vincular o próprio
 * Google. O vínculo sobrevivia à verificação e à redefinição de senha, então o
 * login Google continuava entrando na conta do dono real. A conta `credential`
 * é preservada: a senha acabou de ser provada ou redefinida.
 */
async function dropUnprovenLinks(userId: string) {
  await db
    .delete(schema.account)
    .where(
      and(
        eq(schema.account.userId, userId),
        ne(schema.account.providerId, "credential")
      )
    );
}

export const auth = betterAuth({
  appName: "Bodega Literária",
  baseURL: appUrl,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
  database: drizzleAdapter(db, { provider: "pg", schema }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: false,
    minPasswordLength: MIN_PASSWORD,
    maxPasswordLength: 128,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) =>
      deliver(resetPasswordEmail(user.email, url)),
    // Redefinir a senha pelo link do e-mail prova a posse da caixa: a conta fica verificada.
    onPasswordReset: async ({ user }) => {
      if (!user.emailVerified) {
        // A posse acabou de ser provada; nada vinculado antes disso sobrevive.
        await dropUnprovenLinks(user.id);
        await db
          .update(schema.user)
          .set({ emailVerified: true })
          .where(eq(schema.user.id, user.id));
      }
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60 * 24,
    // Só dispara na primeira verificação (a troca de e-mail tem outro ramo),
    // com o usuário ainda não verificado: mesma limpeza do reset de senha.
    beforeEmailVerification: async (u) => {
      await dropUnprovenLinks(u.id);
    },
    // Também usado na troca de e-mail: o link vai para o endereço novo, com o texto da troca.
    sendVerificationEmail: async (data) => deliver(verificationMessage(data)),
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},

  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      // O Google só se vincula implicitamente a contas locais com e-mail verificado.
      requireLocalEmailVerified: true,
      // Vincular explicitamente (estando logado) pode usar outro endereço Google.
      allowDifferentEmails: true,
    },
  },

  databaseHooks: {
    account: {
      create: {
        after: async (linkedAccount) => {
          await syncGoogleAvatar(db, linkedAccount);
        },
      },
    },
  },

  user: {
    changeEmail: { enabled: true },
    deleteUser: { enabled: true },
  },

  hooks: {
    /**
     * `/link-social` é autorizado só pela presença de sessão, nos dois ramos
     * (`idToken` e redirect). Sem este portão, uma conta cadastrada num
     * endereço alheio e ainda não verificada podia anexar um Google próprio.
     */
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/link-social") {
        return;
      }
      const current = await getSessionFromCtx(ctx);
      // Sem sessão o próprio endpoint responde 401; aqui só barramos a sessão
      // cujo endereço nunca foi provado.
      if (current && !current.user.emailVerified) {
        throw new APIError("FORBIDDEN", {
          code: "EMAIL_NOT_VERIFIED_FOR_LINK",
          message: "Confirme seu e-mail antes de vincular uma conta Google.",
        });
      }
    }),
  },

  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 60, max: e2eMode ? 100 : 10 },
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 60, max: 5 },
      "/send-verification-email": { window: 60, max: 5 },
      "/change-email": { window: 60, max: 5 },
      "/change-password": { window: 60, max: 10 },
      "/delete-user": { window: 60, max: 5 },
    },
  },

  // Precisa ser o último plugin: grava os cookies em Server Actions/Route Handlers.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
