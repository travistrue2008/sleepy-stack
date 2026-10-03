import {
  beforeEach,
  afterEach,
  describe,
  test,
  expect,
  mock,
  spyOn,
} from 'bun:test'

import type { Mock } from 'bun:test'

const utils = await import('./utils')

let warn: Mock<typeof console.warn>

beforeEach(() => {
  warn = spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  warn.mockRestore()
})

describe('requireEnv()', () => {
  afterEach(() => {
    delete process.env.TEST_VAR
  })

  test('when the env var does not exist', () => {
    const fn = () => utils.requireEnv('NON_EXISTENT_ENV_VAR')

    expect(fn).toThrow(new Error('NON_EXISTENT_ENV_VAR is not set'))
  })

  test('when the env var exists', () => {
    process.env.TEST_VAR = 'test'

    const fn = () => utils.requireEnv('TEST_VAR')

    expect(fn).not.toThrow(new Error('TEST_VAR is not set'))
    expect(fn()).toBe('test')
  })
})

describe('retry()', () => {
  test('when input fn passes on first attempt', async () => {
    const fn = mock(async () => 'first')
    const result = await utils.retry(fn)

    expect(result).toBe('first')
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith()
    expect(warn).not.toHaveBeenCalled()
  })

  test('when input fn passes on last attempt', async () => {
    const fn = mock(async () => 'last')

    fn
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))

    const result = await utils.retry(fn)

    expect(result).toBe('last')
    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenNthCalledWith(1)
    expect(fn).toHaveBeenNthCalledWith(2)
    expect(fn).toHaveBeenNthCalledWith(3)
    expect(warn).toHaveBeenCalledOnce()

    expect(warn).toHaveBeenCalledWith(
      'Passed on attempt 3:',
      ['boom-1', 'boom-2'],
    )
  })

  test('when input fn fails on all attempts', async () => {
    const fn = mock()
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))
      .mockRejectedValueOnce(new Error('boom-3'))

    const promise = utils.retry(fn)

    await expect(promise).rejects.toBeInstanceOf(AggregateError)

    await expect(promise).rejects.toMatchObject({
      message: 'Failed to execute function after 3 retries',
      errors: [
        { message: 'boom-1' },
        { message: 'boom-2' },
        { message: 'boom-3' },
      ],
    })

    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn).toHaveBeenNthCalledWith(1)
    expect(fn).toHaveBeenNthCalledWith(2)
    expect(fn).toHaveBeenNthCalledWith(3)
    expect(warn).not.toHaveBeenCalled()
  })

  test('when input fn passes on last attempt (maxAttempts = 2)', async () => {
    const fn = mock(async () => 'last')

    fn.mockRejectedValueOnce(new Error('boom-1'))

    const result = await utils.retry(fn, 2)

    expect(result).toBe('last')
    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1)
    expect(fn).toHaveBeenNthCalledWith(2)
    expect(warn).toHaveBeenCalledOnce()
    expect(warn).toHaveBeenCalledWith('Passed on attempt 2:', ['boom-1'])
  })

  test('when input fn fails on all attempts (maxAttempts = 2)', async () => {
    const fn = mock()
      .mockRejectedValueOnce(new Error('boom-1'))
      .mockRejectedValueOnce(new Error('boom-2'))

    const promise = utils.retry(fn, 2)

    await expect(promise).rejects.toBeInstanceOf(AggregateError)

    await expect(promise).rejects.toMatchObject({
      message: 'Failed to execute function after 2 retries',
      errors: [
        { message: 'boom-1' },
        { message: 'boom-2' },
      ],
    })

    expect(fn).toHaveBeenCalledTimes(2)
    expect(fn).toHaveBeenNthCalledWith(1)
    expect(fn).toHaveBeenNthCalledWith(2)
    expect(warn).not.toHaveBeenCalled()
  })
})
