/* @ts-ignore bun:test resolves via each package's tsconfig, not at the root */
import 'bun:test'

/* @ts-ignore bun:test resolves via each package's tsconfig, not at the root */
declare module 'bun:test' {
  interface Matchers<T = unknown> {
    toHaveBeenCalledOnce(): void
  }
}
