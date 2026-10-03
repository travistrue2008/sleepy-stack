---
paths:
  - "**/*.js"
  - "**/*.mjs"
---

# Linting

Flat config lives at root `eslint.config.mjs`. Run with `bunx eslint .` from the repo root.

## Rules

- **No semicolons** (`semi: never`).
- **Single-quoted strings** (`quotes: single`). Use backticks instead of escaping a single quote inside a string. Do not use double quotes.
- **80-char lines** (`max-len: 80`). Use `/* eslint-disable max-len */` comments exclusively around template literals that change string literals when wrapped.
- **2-space indent** (`indent: 2`, `SwitchCase: 1`).
- **No trailing whitespace** (`no-trailing-spaces`).
- **Trailing commas required on multiline** (`comma-dangle: always-multiline`).
- **Object literal layout:** Object literals with 2+ properties must be multiline, one property per line (`minProperties: 2`). `ObjectPattern`, `ImportDeclaration`, and `ExportDeclaration` are exempt.
- **Array layout:** Array formatting is not linted by ESLint rules. Do not force arbitrary array elements onto new lines unless flagged by the `max-len` 80-character boundary limit.
- **Vertical Whitespace:** Force a blank line before/after any multiline statement, and between a variable declaration and a non-declaration statement. Consecutive single-line declarations do not require a blank line.
- **Function spacing:** Place a single space between a named function's identifier and its parens: `function foo ()`.
- **No bare `Number()` calls:** Use `Number.parseInt(value, 10)` to convert a string to an integer instead of `Number(value)`. Enforced via `no-restricted-syntax` (bans any `Number(...)` call outright) plus `radix: always` (requires the radix argument on `parseInt`).
- **No bare `String()` calls:** Use a template literal, `` `${value}` ``, to convert a value to a string instead of `String(value)`. Enforced via `no-restricted-syntax` (bans any `String(...)` call outright). The two are not perfectly interchangeable: `String(value)` succeeds on a `symbol` while `` `${value}` `` throws a `TypeError`, and TypeScript only catches that when the type is exactly `symbol`, not a `string | symbol` union. Where a value could genuinely be a symbol, narrow it first rather than reaching back for `String()`.

- **Type imports:** Use `import type {}` for type-only imports instead of inlining them with value imports. Place all `import type` statements after all regular import statements.

## References
- Flat config lives at `eslint.config.mjs`; it is the authority when this file and the config disagree.
- For why the config is shaped that way (the TypeScript block, the shared rules object, the ignores) see `@.claude/kbase/style/linting.md`.
