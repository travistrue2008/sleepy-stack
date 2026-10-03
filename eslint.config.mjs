import tseslint from 'typescript-eslint'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

const varDecl = ['const', 'let', 'var']

const multilineTypes = [
  'multiline-block-like',
  'multiline-expression',
  'multiline-const',
  'multiline-let',
  'multiline-var',
]

const rules = {
  'comma-dangle': [
    'error',
    'always-multiline',
  ],
  'curly': ['error', 'all'],
  'indent': [
    'error',
    2,
    { SwitchCase: 1 },
  ],
  'max-len': [
    'error',
    { code: 80 },
  ],
  'no-trailing-spaces': ['error'],
  'no-restricted-syntax': [
    'error',
    {
      selector: 'CallExpression[callee.name="Number"]',
      message: 'Use Number.parseInt(value, 10) instead of Number(value).',
    },
    {
      selector: 'CallExpression[callee.name="String"]',
      message: 'Use a template literal, `${value}`, instead of String(value).',
    },
  ],
  'radix': ['error', 'always'],
  'object-curly-newline': [
    'error',
    {
      ExportDeclaration: {
        multiline: true,
        consistent: true,
      },
      ImportDeclaration: {
        multiline: true,
        consistent: true,
      },
      ObjectExpression: {
        multiline: true,
        consistent: true,
        minProperties: 2,
      },
      ObjectPattern: {
        multiline: true,
        consistent: true,
      },
    },
  ],
  'object-property-newline': [
    'error',
    {
      allowAllPropertiesOnSameLine: false,
    },
  ],
  'padding-line-between-statements': [
    'error',
    {
      blankLine: 'always',
      prev: '*',
      next: varDecl,
    },
    {
      blankLine: 'always',
      prev: varDecl,
      next: '*',
    },
    {
      blankLine: 'any',
      prev: varDecl,
      next: varDecl,
    },
    ...multilineTypes.map(type => ({
      blankLine: 'always',
      prev: type,
      next: '*',
    })),
    ...multilineTypes.map(type => ({
      blankLine: 'always',
      prev: '*',
      next: type,
    })),
  ],
  'semi': ['error', 'never'],
  'quotes': [
    'error',
    'single',
    {
      allowTemplateLiterals: true,
      avoidEscape: true,
    },
  ],
  'space-before-function-paren': [
    'error',
    {
      anonymous: 'ignore',
      asyncArrow: 'ignore',
      named: 'always',
    },
  ],
}

export default [
  {
    ignores: [
      '**/coverage/**',
      '**/node_modules/**',
      '**/dist/**',
      '**/storybook-static/**',
    ],
  },
  {
    files: ['**/*.js'],
    rules,
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    rules: {
      ...rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['**/*.{jsx,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      'react/jsx-max-props-per-line': [
        'error',
        { maximum: 1 },
      ],
      'react/jsx-first-prop-new-line': [
        'error',
        'multiprop',
      ],
      'react/jsx-closing-bracket-location': [
        'error',
        'tag-aligned',
      ],
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]
