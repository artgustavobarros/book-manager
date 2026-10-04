/**
 * Cria (ou recria) um usuário verificado com o acervo de referência do standalone
 * (tests/fixtures/reference-books.json) e a meta 24 — usado no desenvolvimento e nos
 * testes visuais. Uso: pnpm db:seed [email] [senha]
 */
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function main() {
  const email = process.argv[2] ?? "ana@exemplo.com";
  const password = process.argv[3] ?? "senha-forte-123";
  const { eq } = await import("drizzle-orm");
  const { auth } = await import("../lib/auth");
  const { getDb } = await import("../lib/db");
  const { user } = await import("../lib/db/schema");
  const { fromBackup } = await import("../lib/domain/backup");
  const { replaceBooks } = await import("../lib/services/books");
  const { setGoal } = await import("../lib/services/goals");
  const raw = (await import("../tests/fixtures/reference-books.json")).default;

  const db = getDb();
  await db.delete(user).where(eq(user.email, email));
  const { user: created } = await auth.api.signUpEmail({
    body: { name: "Ana Lima", email, password },
  });
  await db
    .update(user)
    .set({ emailVerified: true })
    .where(eq(user.id, created.id));
  await replaceBooks(db, created.id, fromBackup(raw));
  await setGoal(db, created.id, 2026, 24);
  console.log(`Usuário ${email} / ${password} com ${raw.length} livros.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
