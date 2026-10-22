import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    // Cada suíte de integração inicializa PGlite; muitas em paralelo estouram o hook de 10s.
    maxWorkers: 2,
    include: [
      "lib/**/*.test.ts",
      "tests/unit/**/*.test.ts",
      "tests/integration/**/*.test.ts",
    ],
    // Datas determinísticas: o domínio usa o ano e a hora locais.
    env: { TZ: "America/Sao_Paulo" },
    setupFiles: ["tests/setup-env.ts"],
  },
});
