import { HttpError, json, parseBody, withSession } from "@/lib/api";
import { db } from "@/lib/db";
import {
  getPublicShelfState,
  setPublished,
  UnverifiedEmailError,
} from "@/lib/services/public-shelf";
import { publicShelfSchema } from "@/lib/validation/api";

export const GET = withSession(async ({ userId }) =>
  json(await getPublicShelfState(db, userId))
);

/** Publica (`enabled: true`) ou torna privada a estante do usuário da sessão. */
export const PUT = withSession(async ({ request, userId }) => {
  const { enabled } = await parseBody(request, publicShelfSchema);
  try {
    return json(await setPublished(db, userId, enabled));
  } catch (error) {
    if (error instanceof UnverifiedEmailError) {
      throw new HttpError(403, error.message);
    }
    throw error;
  }
});
