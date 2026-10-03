import db from '../../db'
import { client } from '../../../test-helpers'
import { StatusCode } from 'sleepy-serv'
import { afterEach, describe, test, expect } from 'bun:test'

describe('GET /api/health', () => {
  const originalPort = process.env.POSTGRES_PORT

  afterEach(async () => {
    process.env.POSTGRES_PORT = originalPort

    await db.close()
  })

  test('when the database cannot be reached', async () => {
    process.env.POSTGRES_PORT = '1'

    const res = await client.get('/health')
    const result = await res.json()

    expect(res.status).toBe(StatusCode.ServiceUnavailable)
    expect(result).toStrictEqual(null)
  })

  test('when the database is reachable', async () => {
    const res = await client.get('/health')

    expect(res.status).toBe(StatusCode.NoContent)
  })
})
