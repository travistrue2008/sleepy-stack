import api from './api'
import { vi, describe, test, expect, afterEach } from 'vitest'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('api', () => {
  describe('get()', () => {
    test('when invoked', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json({ id: 1 }),
      )

      const res = await api.get('/items/1')

      expect(res.status).toBe(200)

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/items/1', window.location.origin),
        {
          method: 'GET',
          headers: {},
        },
      )
    })

    test('when query params are provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json([]),
      )

      await api.get('/items', {
        query: { filter: 'active' },
      })

      const url = (fetch as unknown as { mock: { calls: unknown[][] } })
        .mock.calls[0]![0] as URL

      expect(url.searchParams.get('filter')).toBe('active')
    })
  })

  describe('post()', () => {
    test('when invoked without body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json({ id: 1 }),
      )

      await api.post('/items')

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/items', window.location.origin),
        {
          method: 'POST',
          headers: {},
        },
      )
    })

    test('when invoked with body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json({ id: 1 }),
      )

      await api.post('/items', {
        body: { name: 'test' },
      })

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/items', window.location.origin),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{"name":"test"}',
        },
      )
    })

    test('when invoked with a string body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json({ id: 1 }),
      )

      await api.post('/items', {
        body: 'raw string body',
      })

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/items', window.location.origin),
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: 'raw string body',
        },
      )
    })

    test('when a custom content-type header is provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      )

      await api.post('/upload', {
        headers: { 'content-type': 'text/plain' },
        body: 'plain text',
      })

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/upload', window.location.origin),
        {
          method: 'POST',
          headers: { 'content-type': 'text/plain' },
          body: 'plain text',
        },
      )
    })

    test('when custom headers are provided', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json({ id: 1 }),
      )

      await api.post('/items', {
        headers: { 'x-custom': 'value' },
        body: { name: 'test' },
      })

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/items', window.location.origin),
        {
          method: 'POST',
          headers: {
            'x-custom': 'value',
            'content-type': 'application/json',
          },
          body: '{"name":"test"}',
        },
      )
    })
  })

  describe('put()', () => {
    test('when invoked with body', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        Response.json({ id: 1 }),
      )

      await api.put('/items/1', {
        body: { name: 'Updated' },
      })

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/items/1', window.location.origin),
        {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: '{"name":"Updated"}',
        },
      )
    })
  })

  describe('delete()', () => {
    test('when invoked', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
        new Response(null, { status: 204 }),
      )

      const res = await api.delete('/items/1')

      expect(res.status).toBe(204)

      expect(fetch).toHaveBeenCalledOnce()

      expect(fetch).toHaveBeenCalledWith(
        new URL('/api/items/1', window.location.origin),
        {
          method: 'DELETE',
          headers: {},
        },
      )
    })
  })
})
