import { loadEnvConfig } from "@next/env";

import { runMigrations } from "../lib/db/migrate";

loadEnvConfig(process.cwd());

// No Neon, migrations vão pela conexão direta quando disponível (DDL fora do pooler).
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL não definida.");
  process.exit(1);
}

runMigrations(url)
  .then(() => console.log("Migrations aplicadas."))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
