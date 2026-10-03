import db from '../../db'
import { client } from '../../../test-helpers'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'

describe('GET /api/items', () => {
  test('when no items exist', async () => {
    const res = await client.get('/items')
    const result = await res.json()

    expect(res.status).toBe(StatusCode.Ok)
    expect(result).toStrictEqual([])
  })

  test('when items exist', async () => {
    await db.conn.insert(db.items).values([
      {
        name: 'First',
        description: 'First item',
      },
      {
        name: 'Second',
        description: 'Second item',
      },
    ])

    const res = await client.get('/items')
    const result = await res.json()

    expect(res.status).toBe(StatusCode.Ok)

    expect(result).toStrictEqual([
      {
        id: 1,
        name: 'First',
        description: 'First item',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
      {
        id: 2,
        name: 'Second',
        description: 'Second item',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      },
    ])
  })
})
