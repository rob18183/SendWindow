module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: ['eslint:recommended'],
  ignorePatterns: [
    'dist/',
    'node_modules/',
    'src/**/*.ts',
    'src/**/*.tsx',
  ],
  plugins: ['react-hooks', 'react-refresh'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['server/**/*.mjs'],
      rules: {
        'no-console': 'off',
      },
    },
  ],
};
