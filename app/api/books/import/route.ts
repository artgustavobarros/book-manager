import { badRequest, json, parseBody, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import { fromBackup, InvalidBackupError } from "@/lib/domain/backup";
import { listBooks, replaceBooks } from "@/lib/services/books";
import { importSchema } from "@/lib/validation/api";

/** Restaurar backup JSON (deste app ou do standalone): substitui o acervo inteiro. */
export const POST = withSession(async ({ request, userId }) => {
  const data = await parseBody(request, importSchema);
  let fields: ReturnType<typeof fromBackup>;
  try {
    fields = fromBackup(data);
  } catch (error) {
    if (error instanceof InvalidBackupError) {
      throw badRequest("Arquivo inválido.");
    }
    throw error;
  }
  const count = await replaceBooks(db, userId, fields);
  return json({ count, books: await listBooks(db, userId) });
});
