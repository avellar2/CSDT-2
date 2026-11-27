import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/**
 * Configuração efetiva do ESLint (flat config).
 *
 * O repositório usa Next.js 15 + React 19. `next/core-web-vitals` habilita as
 * regras de acessibilidade, hooks e boas práticas do framework. Regras que
 * gerariam ruído em código legado ficam como aviso para não bloquear o build;
 * regras de correção (hooks, imports inválidos, etc.) continuam como erro.
 */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "local-agent/**",
      "public/**",
      "dist/**",
      "coverage/**",
      ".commandcode/**",
      "prisma/migrations/**",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    files: ["**/*.{js,jsx,ts,tsx,mjs,cjs}"],
    rules: {
      // Código legado: não bloquear por variáveis não usadas/`any`.
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      // Avisos úteis, sem quebrar o build por dívida antiga.
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "react/no-unescaped-entities": "warn",
      "import/no-anonymous-default-export": "warn",
    },
  },
];
