import db from '../../db'
import { client, getAllRecords } from '../../../test-helpers'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'

function genBody () {
  return {
    name: 'Test Item',
    description: 'A test item description',
  }
}

describe('POST /api/items', () => {
  test('when "body.name" is missing', async () => {
    const body = genBody()

    delete (body as Record<string, unknown>).name

    const res = await client.post('/items', { body })
    const result = await res.json()

    expect(res.status).toBe(StatusCode.BadRequest)

    expect(result).toStrictEqual({
      error: 'name is required and must be a non-empty string',
    })

    const items = await getAllRecords(db.items)

    expect(items).toStrictEqual([])
  })

  test('when "body.name" is empty', async () => {
    const body = genBody()

    body.name = ''

    const res = await client.post('/items', { body })
    const result = await res.json()

    expect(res.status).toBe(StatusCode.BadRequest)

    expect(result).toStrictEqual({
      error: 'name is required and must be a non-empty string',
    })

    const items = await getAllRecords(db.items)

    expect(items).toStrictEqual([])
  })

  test('when "body.name" exceeds 255 characters', async () => {
    const body = genBody()

    body.name = 'a'.repeat(256)

    const res = await client.post('/items', { body })
    const result = await res.json()

    expect(res.status).toBe(StatusCode.BadRequest)

    expect(result).toStrictEqual({
      error: 'name must not exceed 255 characters',
    })

    const items = await getAllRecords(db.items)

    expect(items).toStrictEqual([])
  })

  test('when invoked with valid body', async () => {
    const body = genBody()

    const res = await client.post('/items', { body })
    const result = await res.json() as Record<string, unknown>

    expect(res.status).toBe(StatusCode.Created)

    expect(result).toStrictEqual({
      id: result.id,
      name: 'Test Item',
      description: 'A test item description',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })

    const items = await getAllRecords(db.items)

    expect(items).toHaveLength(1)
  })

  test('when "body.description" is omitted', async () => {
    const body = genBody()

    delete (body as Record<string, unknown>).description

    const res = await client.post('/items', { body })
    const result = await res.json() as Record<string, unknown>

    expect(res.status).toBe(StatusCode.Created)

    expect(result).toStrictEqual({
      id: result.id,
      name: 'Test Item',
      description: '',
      createdAt: expect.any(String),
      updatedAt: expect.any(String),
    })
  })
})
