import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // THE HAND BOUNDARY.
  // Nothing outside src/lib/hand may import a concrete provider. The only entry
  // to the hand is `@/lib/hand` (the interface + getHand seam). Deep imports
  // like `@/lib/hand/fashn` are how a provider leaks into product code, so they
  // are a build error everywhere below.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/hand/*", "**/lib/hand/*"],
              message:
                "Import the hand only through '@/lib/hand'. Nothing outside src/lib/hand may import a provider directly.",
            },
          ],
        },
      ],
    },
  },
  // Inside src/lib/hand the boundary does not apply — this is where providers
  // are wired together behind the interface.
  {
    files: ["src/lib/hand/**/*"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
