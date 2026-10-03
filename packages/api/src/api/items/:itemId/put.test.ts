import db from '../../../db'
import { client } from '../../../../test-helpers'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'

describe('PUT /api/items/:itemId', () => {
  test('when "params.itemId" is non-numeric', async () => {
    const res = await client.put('/items/abc', {
      body: { name: 'Updated' },
    })

    const result = await res.json()

    expect(res.status).toBe(StatusCode.BadRequest)

    expect(result).toStrictEqual({
      error: 'itemId must be a number',
    })
  })

  test('when item does not exist', async () => {
    const res = await client.put('/items/999', {
      body: { name: 'Updated' },
    })

    const result = await res.json()

    expect(res.status).toBe(StatusCode.NotFound)

    expect(result).toStrictEqual({
      error: 'item not found',
    })
  })

  test('when "body.name" is empty', async () => {
    const [item] = await db.conn
      .insert(db.items)
      .values({ name: 'Original' })
      .returning()

    const res = await client.put(`/items/${item!.id}`, {
      body: { name: '' },
    })

    const result = await res.json()

    expect(res.status).toBe(StatusCode.BadRequest)

    expect(result).toStrictEqual({
      error: 'name must be a non-empty string',
    })
  })

  test('when invoked with valid body', async () => {
    const [item] = await db.conn
      .insert(db.items)
      .values({
        name: 'Original',
        description: 'Original description',
      })
      .returning()

    const res = await client.put(`/items/${item!.id}`, {
      body: {
        name: 'Updated',
        description: 'Updated description',
      },
    })

    const result = await res.json()

    expect(res.status).toBe(StatusCode.Ok)

    expect(result).toStrictEqual({
      id: item!.id,
      name: 'Updated',
      description: 'Updated description',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  })
})
