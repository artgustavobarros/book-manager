import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", destructuredArrayIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Variáveis de ambiente só via `env.ts` (T3 Env).
    files: ["app/**", "components/**", "lib/**", "hooks/**"],
    rules: {
      "no-restricted-properties": [
        "error",
        { object: "process", property: "env", message: "Importe `env` de '@/env'." },
      ],
    },
  },
  {
    // Testes comparam com o standalone (JS sem tipos) e scripts CommonJS.
    files: ["**/*.test.ts", "tests/**"],
    rules: { "@typescript-eslint/no-explicit-any": "off" },
  },
  {
    files: ["scripts/**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Material de referência do design e ferramentas (não é código do app).
    "design/**",
    "openspec/**",
    ".agent/**",
    ".agents/**",
    ".claude/**",
    ".codex/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
