# Linting

The rules themselves are in [`.claude/rules/linting.md`](../../rules/linting.md).
This page records why `eslint.config.mjs` is shaped the way it is.

- **One shared rules object.** The style rules (semicolons, quotes, line length,
  blank-line padding, object layout, and the `Number()`/`String()` bans) are
  defined once and spread into each file-type block, so JavaScript and
  TypeScript can never drift apart.
- **A TypeScript block.** `**/*.{ts,tsx}` adds the `typescript-eslint` parser
  and plugin on top of the shared rules, plus `no-explicit-any`. TypeScript is
  the language of the whole repo, `e2e/` included.
- **A React block.** `**/*.{jsx,tsx}` adds the React and React Hooks rules,
  including the one-prop-per-line JSX layout. They are kept apart so non-UI code
  is not subject to them.
- **Explicit ignores.** Flat config does not read `.gitignore`, so generated
  output is listed by hand: coverage, `node_modules`, `dist` and
  `storybook-static`.
- **Not linted.** No block matches `.mjs`, so the config file itself is outside
  the rules.

Back to the [index](../index.md).
