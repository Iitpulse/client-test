import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // The dev-only kitchen sink is a verbatim copy of the @iitpulse/ui preview boards (static specimen text and
  // data tables of JSX, a replayable demo effect). Kept identical to the package's copy instead of reformatted.
  {
    files: ["src/components/kitchen-sink/**"],
    rules: {
      "react/no-unescaped-entities": "off",
      "react/jsx-key": "off",
      "react-hooks/set-state-in-effect": "off",
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
