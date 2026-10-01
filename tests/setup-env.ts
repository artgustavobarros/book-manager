// Variáveis padrão para os testes de unidade e integração (banco PGlite em memória).
process.env.SKIP_ENV_VALIDATION ??= "1";
process.env.DATABASE_URL ??= "pglite://memory";
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-00";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
process.env.EMAIL_TRANSPORT ??= "outbox";
