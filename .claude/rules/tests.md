---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.stories.ts"
  - "**/*.stories.tsx"
---

# Writing tests

Guidelines for tests in this repo, on top of what's already in `CLAUDE.md`.

Applies to `packages/api` and `packages/db` tests (colocated `*.test.ts`,
Bun's runner) and `packages/ui` tests (colocated `*.test.{ts,tsx}` on
Vitest/jsdom, and `*.stories.tsx` run as component tests in a real browser).
The whole repo is TypeScript; a `.js` suite is silently never collected.

Story `play` functions are tests too: the structure and assertion guidance below
applies to them, though `describe()`/`test()` naming does not, since a story's
export name is its label.

## Structure

- Follow **AAA** (_Arrange_, _Act_, _Assert_) within each `test()` body.
- `describe()` block usage:
  - Use to group tests for functions, classes, and class methods
  - Avoid using for high-level tests (such as E2E tests)
  - Class methods (static and instance) get a nested `describe()` block
  - Function/instance method example: `describe('createMessage()')`
  - Static method example: `describe('.connect()')` (leading dot, no class name)
- Every `test()` name starts with `"when …"`
  - Test labels
    - Describe the "cause" (_Act_ portion)
    - **DOES NOT** describe the "effect" (_Assert_ portion)
  - Assertions will articulate the expected "effect"
  - Example: `test('when the queue is empty', ...)`
- Write and order **failure cases before success cases** within a `describe()` block.
- Avoid mixing the _Act_ and _Assert_ phases where possible
- Don't write helper functions that mix _Act_ and _Assert_ phases

## Missing Type for `.toHaveBeenCalledOnce()`

**This section is ONLY for TypeScript projects**

The type definition for `.toHaveBeenCalledOnce()` is currently missing from `bun-types` as of `bun` version `1.3.13`. To remedy this, make sure a top-level `types.ts` file is created, and includes this content:

```typescript
import 'bun:test'

declare module 'bun:test' {
  interface Matchers<T = unknown> {
    toHaveBeenCalledOnce(): void
  }
}
```

Then, add this to the `include` array in the `tsconfig.json` file for the project, or _sub-projects_ if this is a monorepo.

## Assertions

### General

- **Assert the call's result first**, before anything else
- Prefer `.toHaveBeenCalledOnce()` over `.toHaveBeenCalledTimes(1)`.
- `.toHaveBeenCalledOnce()` should always have a follow-up assertion to `.toHaveBeenCalledWith()` for the same function
- `.toHaveBeenCalledTimes(N)` should always have N-amount of follow-up assertions to `.toHaveBeenNthCalledWith()` for that same function
- For whole-object assertions, use `expect(actual).toStrictEqual({...})` with the full expected
  shape spelled out, rather than checking individual fields piecemeal.
- When an object contains a generated/non-deterministic field (e.g. a uuid `id`), echo the actual
  value back into the expected object (`id: actual.id`) instead of asserting on it separately,
  this keeps `toStrictEqual()` exact everywhere else without fighting randomness.
- Use `expect.any()` for any `createdAt` and `updatedAt` properties with the appropriate type (`Date` for DB records, `String` for JSON responses). These are dynamically generated timestamps where only existence and type matter, not the specific value.
- When testing functions that should throw an error
  - If synchronous:
    1. Wrap the function call into a variable called `fn`
    2. Pass `fn` into `expect()`
  - If asynchronous:
    1. Call the function, assign return value to a variable called `promise`
    2. Pass `promise` into `await expect()`

### Inline Assertions Instead of Using Calculated Functions

**WRONG**

```javascript
function genRequest (overrides = {}) {
  return {
    model: 'claude-haiku-4-5',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: 'What is 1 + 2?',
      },
    ],
    ...overrides,
  }
}

/* ... */

expect(result).toHaveBeenCalledWith(genRequest())
```

**CORRECT**

```javascript
expect(result).toHaveBeenCalledWith({
  model: 'claude-haiku-4-5',
  max_tokens: 1024,
  messages: [
    {
      role: 'user',
      content: 'What is 1 + 2?',
    },
  ],
})
```

### Asserting Error Types/Messages

When asserting that an error has been thrown, make sure to include the specific error constructor and message. This applies for both `expect().toThrow()` and `expect().rejects.toThrow()`.

**WRONG**

```javascript
await expect(promise).rejects.toBeInstanceOf(AggregateError)

await expect(promise).rejects.toThrow(
  'Failed to execute function after 2 retries',
)

await expect(promise).rejects.toMatchObject({
  errors: [
    { message: 'boom-1' },
    { message: 'boom-2' },
  ],
})
```

**CORRECT**

```javascript
/* async example */

await expect(promise).rejects.toThrow(
  new AggregateError([
    { message: 'boom-1' },
    { message: 'boom-2' },
  ], 'Failed to execute function after 2 retries')
)
```

```javascript
/* sync example */

expect(fn).toThrow(new Error('A problem occurred'))
```

## Mocks

### Prefer `*Once()` Mock Functions

Use the following functions when mocking the results of functions inside of individual tests:

- `.mockReturnValueOnce()` over `.mockReturnValue()`
- `.mockResolvedValueOnce()` over `.mockResolvedValue()`
- `.mockRejectedValueOnce()` over `.mockRejectedValue()`
- `.mocImplementationOnce()` over `.mocImplementation()`

Futhermore, if a mocked function is expected to be called multiple times, which requires multiple mocks, then chain these calls together like so:

```javascript
const fn = mock()
  .mockResolvedValueOnce('result-1')
  .mockResolvedValueOnce('result-2')
  .mockResolvedValueOnce('result-3')
```

### Mocking Functions with Results

Use value helpers instead of hand-written implementations when the mock just needs to produce a fixed outcome:

- `.mockReturnValue(value)` over `.mockImplementation(() => value)`
- `.mockReturnValueOnce(value)` over `.mockImplementationOnce(() => value)`
- `.mockResolvedValue(value)` over `.mockImplementation(async () => value)`
- `.mockResolvedValueOnce(value)` over `.mockImplementationOnce(async () => value)`
- `.mockRejectedValue(error)` over `.mockImplementation(async () => { throw error })`
- `.mockRejectedValueOnce(error)` over `.mockImplementationOnce(async () => { throw error })`

### When to Use `.mockImplementation()` and `.mockImplementationOnce()`

Only use `.mockImplementation()`/`.mockImplementationOnce()` when it benefits the test to output a result based off of the functions inputs. This is pretty rare, and generally avoided though.

## References

- For the testing architecture (why each package uses a different runner, how the two Vitest projects split, and how coverage aggregates) see `@.claude/kbase/architecture/ui-testing.md`.
- For fake timers and the frozen-clock convention shared with `packages/api`, see the time mocking section of `@.claude/kbase/architecture/ui-testing.md`.
