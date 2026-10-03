# Const Object Values

Always import and reference the `const` object and use its members/variants instead of using a literal.

For example:

```typescript
/* types.ts */

export const Difficulty = {
  Easy: 'easy',
  Medium: 'medium',
  Hard: 'hard',
} as const

export type Difficulty = typeof Difficulty[keyof typeof Difficulty]
```

**Wrong:**

```typescript
/* some-module.ts */

difficulty: 'easy' /* shouldn't use string literal here */
```

**Correct:**

```typescript
/* some-module.ts */

import { Difficulty } from './types'

difficulty: Difficulty.Easy /* use variant instead */
```

This applies everywhere: production code, test code, and fixture data. The only exception is intentionally invalid values used in negative tests (e.g. testing that an unknown difficulty is rejected).
