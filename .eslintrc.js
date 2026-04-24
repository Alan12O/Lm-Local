module.exports = {
  root: true,
  extends: '@react-native',
  plugins: [
    'react-native',
    'react',
    'react-hooks',
  ],
  env: {
    jest: true,
    browser: true,
    node: true,
    es6: true,
  },
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      },
    ],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'warn',

    // Code quality (built-in)
    'no-empty': 'warn',
    'no-else-return': 'warn',
    'prefer-template': 'warn',
    complexity: ['warn', 50],
    'max-lines-per-function': ['warn', 600],
    'max-lines': ['warn', 1000],
    'max-params': ['warn', 10],
    // React hooks
    'react-hooks/rules-of-hooks': 'warn',
    'react-hooks/exhaustive-deps': 'warn',

    // React Native
    'react-native/no-unused-styles': 'warn',
    'react-native/no-inline-styles': 'warn',
    'react-native/no-color-literals': 'warn',
    'react-native/no-raw-text': 'warn',
    'react-native/no-single-element-style-arrays': 'warn',
  },
  overrides: [
    {
      files: ['src/**/*'],
      rules: {
        'no-bitwise': 'off',
        'no-void': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        'eslint-comments/no-unused-disable': 'off',
      },
    },
    {
      // Relax structural rules in test files — large test suites and helpers are acceptable
      files: ['__tests__/**/*', '*.test.ts', '*.test.tsx', 'jest.setup.ts'],
      rules: {
        'max-lines': 'off',
        'max-lines-per-function': 'off',
        'max-params': 'off',
        complexity: 'off',
        'react-native/no-inline-styles': 'off',
        'react-native/no-raw-text': 'off',
        'react-native/no-color-literals': 'off',
      },
    },
  ],
};
