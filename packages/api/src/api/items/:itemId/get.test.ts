import db from '../../../db'
import { client } from '../../../../test-helpers'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'

describe('GET /api/items/:itemId', () => {
  test('when "params.itemId" is non-numeric', async () => {
    const res = await client.get('/items/abc')
    const result = await res.json()

    expect(res.status).toBe(StatusCode.BadRequest)

    expect(result).toStrictEqual({
      error: 'itemId must be a number',
    })
  })

  test('when item does not exist', async () => {
    const res = await client.get('/items/999')
    const result = await res.json()

    expect(res.status).toBe(StatusCode.NotFound)

    expect(result).toStrictEqual({
      error: 'item not found',
    })
  })

  test('when item exists', async () => {
    const [item] = await db.conn
      .insert(db.items)
      .values({
        name: 'Test Item',
        description: 'A description',
      })
      .returning()

    const res = await client.get(`/items/${item!.id}`)
    const result = await res.json()

    expect(res.status).toBe(StatusCode.Ok)

    expect(result).toStrictEqual({
      id: item!.id,
      name: 'Test Item',
      description: 'A description',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  })
})
