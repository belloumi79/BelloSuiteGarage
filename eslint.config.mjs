import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactCompiler from "eslint-plugin-react-compiler";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Default Next.js + scratch ignores
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "scratch/**",
    "src/lib/seed.ts",
  ]),
  {
    plugins: {
      "react-compiler": reactCompiler,
    },
    rules: {
      "react-compiler/react-compiler": "off",
      // Temporarily disable overly strict React Compiler rules to avoid
      // cascading refactors. Data-fetching via async callbacks in useEffect is
      // a standard pattern used across the app and safe in this context. A
      // future refactor to React Query / server components should remove this.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
]);

export default eslintConfig;
