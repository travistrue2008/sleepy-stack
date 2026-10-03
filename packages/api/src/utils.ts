const DEFAULT_MAX_RETRIES = 3

export function requireEnv (name: string): string {
  const value = process.env[name]

  if (!value) {
    throw new Error(`${name} is not set`)
  }

  return value
}

export async function retry<TResult> (
  fn: () => Promise<TResult>,
  maxAttempts: number = DEFAULT_MAX_RETRIES,
): Promise<TResult> {
  const message = `Failed to execute function after ${maxAttempts} retries`
  const errs: Error[] = []

  let result = undefined as TResult

  for (let i = 0; i < maxAttempts; ++i) {
    try {
      result = await fn()

      if (errs.length) {
        const messages = errs.map((err) => err.message)

        console.warn(`Passed on attempt ${i + 1}:`, messages)
      }

      break
    } catch (err) {
      errs.push(err as Error)

      if (i < maxAttempts - 1) {
        continue
      }

      throw new AggregateError(errs, message)
    }
  }

  return result
}
