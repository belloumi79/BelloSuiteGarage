import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
  // Disable react-compiler rule (plugin not installed) and relax for large client components
  {
    rules: {
      "react-compiler/react-compiler": "off",
    },
  },
]);

export default eslintConfig;
