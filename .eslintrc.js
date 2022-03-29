module.exports = {
  root: true,
  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
  },
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'import',
    'sort-imports-es6-autofix',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:import/recommended',
    'plugin:import/typescript',
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
  ],
  settings: {
    'import/core-modules': ['aws-lambda', 'aws-sdk'],
    'import/resolver': {
      typescript: {},
    }
  },
  rules: {
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'sort-imports-es6-autofix/sort-imports-es6': 'error',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    'eslint-disable @typescript-eslint/no-unsafe-call': 'off', // false positives
    'eslint-disable @typescript-eslint/no-unsafe-argument': 'off', // false positives
  },
}
