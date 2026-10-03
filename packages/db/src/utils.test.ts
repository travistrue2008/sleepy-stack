import { beforeEach, describe, test, expect } from 'bun:test'
import { requireEnv } from './utils'

describe('requireEnv()', () => {
  beforeEach(() => {
    delete process.env.TEST_VAR
  })

  test('when the env var does not exist', () => {
    const fn = () => requireEnv('NON_EXISTENT_ENV_VAR')

    expect(fn).toThrow(new Error('NON_EXISTENT_ENV_VAR is not set'))
  })

  test('when the env var exists', () => {
    process.env.TEST_VAR = 'test'

    const fn = () => requireEnv('TEST_VAR')

    expect(fn).not.toThrow(new Error('TEST_VAR is not set'))
    expect(fn()).toBe('test')
  })
})
