---
paths:
  - "packages/ui/**/*.tsx"
  - "packages/ui/routes.tsx"
---

# Organization

This document pertains to the `packages/ui` package, so all paths mentioned going forward start from there. For example, if `/src/components` is mentioned, then the true path is `packages/ui/src/components`.

Here's details about the file structure:

- All implementation files go into `/src`, however, there are exceptions such as config files, which match this pattern: `**.config.ts`.
- All implementation files inside of `/src/components` must define and export components. These files can also export other things such as TypeScript types, objects, and utility functions as long as it update things.
- Tests
  - `vitest` suites match this file pattern: `**.test.{ts,tsx}` (the glob in
    `vitest.config.ts`; a `.js` suite is silently never collected)
  - Storybook suites match this file pattern: `**.stories.tsx`
- "Code" tests
  - Are colocated to the same directory with their implementing module
  - Have the same file "stem" as their implementing file, so that they're grouped together
  - Component files **ONLY** have Storybook files
  - Component files **DO NOT** have `vitest` suites
  - Non-component files **ONLY** have `vitest` suites
  - Non-component files **DO NOT** have Storybook suites
