import db from '../../../db'
import { client, getAllRecords } from '../../../../test-helpers'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'

describe('DELETE /api/items/:itemId', () => {
  test('when "params.itemId" is non-numeric', async () => {
    const res = await client.delete('/items/abc')
    const result = await res.json()

    expect(res.status).toBe(StatusCode.BadRequest)

    expect(result).toStrictEqual({
      error: 'itemId must be a number',
    })
  })

  test('when item does not exist', async () => {
    const res = await client.delete('/items/999')
    const result = await res.json()

    expect(res.status).toBe(StatusCode.NotFound)

    expect(result).toStrictEqual({
      error: 'item not found',
    })
  })

  test('when item exists', async () => {
    const [item] = await db.conn
      .insert(db.items)
      .values({ name: 'To Delete' })
      .returning()

    const res = await client.delete(`/items/${item!.id}`)

    expect(res.status).toBe(StatusCode.NoContent)

    const items = await getAllRecords(db.items)

    expect(items).toStrictEqual([])
  })
})
