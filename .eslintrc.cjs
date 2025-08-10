module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: ["eslint:recommended", "prettier"],
  parserOptions: {
    ecmaVersion: 2022,
  },
  ignorePatterns: ["public/"],
  overrides: [
    {
      files: ["tests/**/*.js"],
      env: { mocha: true },
    },
    {
      files: ["vite.config.js"],
      parserOptions: { sourceType: "module" },
    },
  ],
  rules: {
    "no-unused-vars": [
      "error",
      {
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
  },
};
