---
paths:
  - "packages/ui/src/components/**/*.tsx"
---

# Styling

- Exclusively use `emotion` (`@emotion/react` / `@emotion/styled`) for all React component styling in `packages/ui`. Do not add another styling library (CSS modules, styled-components, Tailwind, plain `.css` imports, etc.).
- Prefer `@emotion/styled` for elements that only need static or prop-driven styles. Use the `css` prop (via the `@emotion/react` `jsx` pragma or `css` helper) for one-off style overrides on an existing element.
- Do not use inline `style={{ ... }}` objects or plain `style` constant objects for component styling. Existing inline-style code (for example `packages/ui/src/components/app/Page.tsx`) should be migrated to emotion when it is next touched, not necessarily all at once.
- Global/static CSS that isn't tied to a specific component (font imports, CSS resets) is exempt from this rule and stays as plain `.css` imports in `App.tsx`.
- Colocate a component's styled elements above the component in the same file unless the file grows large enough to warrant a separate `*.styles.ts` file next to it.
