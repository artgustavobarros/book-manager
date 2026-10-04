// Variáveis padrão para os testes de unidade e integração (banco PGlite em memória).
process.env.SKIP_ENV_VALIDATION ??= "1";
process.env.DATABASE_URL ??= "pglite://memory";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-00";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.EMAIL_TRANSPORT ??= "outbox";
process.env.CRON_SECRET ??= "test-cron-secret-123456789";
// Caixa de saída separada por worker (os arquivos de teste rodam em paralelo).
process.env.EMAIL_OUTBOX_FILE ??= `.data/test-outbox-${process.env.VITEST_POOL_ID ?? "0"}.jsonl`;
