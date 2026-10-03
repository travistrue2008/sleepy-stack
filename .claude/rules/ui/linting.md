---
paths:
  - "packages/ui/src/components/**/*.tsx"
---

# Linting

- **Multi-prop JSX layout:** A JSX element with 2+ props/attributes must have
  one prop per line, with the opening tag's `>` on its own line. A single
  prop (or no props) may stay on the tag's line. Enforced by
  `react/jsx-max-props-per-line`, `react/jsx-first-prop-new-line`, and
  `react/jsx-closing-bracket-location` in the JSX/TSX block of
  `eslint.config.mjs`; auto-fixable via `bunx eslint . --fix`.

  **DO:**
  ```jsx
  <Button
    id="button-action"
    onClick={handleButtonClick}
  >Test</Button>
  ```

  **NOT:**
  ```jsx
  <Button id="button-action" onClick={handleButtonClick}>Test</Button>
  ```
