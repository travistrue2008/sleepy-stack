import { describe, test, expect } from 'vitest'
import { HttpError } from './errors'

describe('HttpError', () => {
  test('when constructed with only a status', () => {
    const error = new HttpError(404)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(HttpError)
    expect(error.status).toBe(404)
    expect(error.message).toBe('HTTP 404')
  })

  test('when constructed with a status and message', () => {
    const error = new HttpError(409, 'Conflict detected')

    expect(error.status).toBe(409)
    expect(error.message).toBe('Conflict detected')
  })
})
