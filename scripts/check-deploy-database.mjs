// Fail before migrations if Vercel did not supply the expected Neon database.
const environment = process.env.VERCEL_ENV;

if (
  environment === "production" &&
  (!process.env.PRODUCTION_NEON_PROJECT_ID ||
    process.env.NEON_PROJECT_ID !== process.env.PRODUCTION_NEON_PROJECT_ID)
) {
  throw new Error(
    "Production must use the configured Neon production project."
  );
}

if (environment === "preview") {
  const expectedProject = process.env.PREVIEW_NEON_PROJECT_ID;
  const baseHost = process.env.PREVIEW_BASE_DATABASE_HOST;
  const databaseUrl = process.env.DATABASE_URL;
  const directUrl = process.env.DATABASE_URL_UNPOOLED;

  if (
    !(expectedProject && baseHost && databaseUrl && directUrl) ||
    process.env.NEON_PROJECT_ID !== expectedProject
  ) {
    throw new Error(
      "Preview Neon configuration is missing or points to another project."
    );
  }

  let pooledHost;
  let directHost;
  try {
    pooledHost = new URL(databaseUrl).hostname;
    directHost = new URL(directUrl).hostname;
  } catch {
    throw new Error("Preview Neon connection URLs are invalid.");
  }

  if (pooledHost === baseHost || directHost === baseHost) {
    throw new Error(
      "Preview Neon branch was not created; refusing to run migrations."
    );
  }
}
