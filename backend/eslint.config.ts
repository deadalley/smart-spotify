import { defineConfig } from "eslint/config";
import globals from "globals";
import sharedConfig from "../eslint.config.shared.ts";

export default defineConfig([
  ...sharedConfig,
  {
    files: ["**/*.{js,ts}"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": "off",
    },
  },
  {
    files: ["**/*.{ts}"],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ["./tsconfig.json"],
      },
    },
  },
]);
