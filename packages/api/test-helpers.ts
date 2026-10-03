import db from './src/db'
import * as schema from '@example/orm'
import { createApp } from 'sleepy-serv'
import { HttpMethod } from 'sleepy-serv'
import { jest, setSystemTime } from 'bun:test'
import { is, eq, getTableName } from 'drizzle-orm'
import { PgTable, PgColumn } from 'drizzle-orm/pg-core'

import type { App, AsyncHandlerResult } from 'sleepy-serv'
import type { InferSelectModel } from 'drizzle-orm'

export const EPOCH = new Date('2000-01-01T00:00:00.000Z')!

export type RequestOptions = {
  headers?: Record<string, string>
  query?: Record<string, string>
  body?: string | object
}

export type TestClient = {
  get (route: string, opts?: RequestOptions): AsyncHandlerResult
  post (route: string, opts?: RequestOptions): AsyncHandlerResult
  put (route: string, opts?: RequestOptions): AsyncHandlerResult
  delete (route: string, opts?: RequestOptions): AsyncHandlerResult
}

type FetchInit = {
  method: string
  headers: Record<string, string>
  body?: string
}

type TableWithId = PgTable & {
  id: PgColumn
  $inferSelect: { id: unknown }
}

export let app!: App
export let client!: TestClient

const TABLE_NAMES = Object.values(schema)
  .filter(value => is(value, PgTable))
  .map(value => `"${getTableName(value)}"`)

function buildUrl (
  port: number,
  route: string,
  query: Record<string, string>,
): URL {
  const url = new URL(`/api${route}`, `http://localhost:${port}`)

  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value)
  }

  return url
}

function makeRequest (
  port: number,
  method: string,
  route: string,
  opts: RequestOptions = {},
): AsyncHandlerResult {
  const {
    headers = {},
    query = {},
    body,
  } = opts

  const init: FetchInit = {
    method,
    headers: { ...headers },
  }

  if (body !== undefined) {
    init.headers['content-type'] ??= 'application/json'
    init.body = typeof body === 'string' ? body : JSON.stringify(body)
  }

  return fetch(buildUrl(port, route, query), init)
}

function createTestClient (): TestClient {
  const port = app.server.port!

  return {
    get (route: string, opts: RequestOptions = {}) {
      return makeRequest(port, HttpMethod.Get, route, opts)
    },
    post (route: string, opts: RequestOptions = {}) {
      return makeRequest(port, HttpMethod.Post, route, opts)
    },
    put (route: string, opts: RequestOptions = {}) {
      return makeRequest(port, HttpMethod.Put, route, opts)
    },
    delete (route: string, opts: RequestOptions = {}) {
      return makeRequest(port, HttpMethod.Delete, route, opts)
    },
  }
}

function createTestApp (): App {
  return createApp(0, {
    mountPath: '/api',
  })
}

async function truncateTables (): Promise<void> {
  if (!TABLE_NAMES.length) {
    return
  }

  const tables = TABLE_NAMES.join(', ')

  await db.conn.$client.unsafe(
    `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`,
  )
}

export async function setup () {
  app = createTestApp()
  client = createTestClient()
}

export async function teardown () {
  await truncateTables()
  await app.close(true)
  await db.close()

  app = undefined as unknown as App
  client = undefined as unknown as TestClient
}

export async function useRealTimers<T> (
  fn: () => T | Promise<T>,
): Promise<T> {
  setSystemTime()
  jest.useRealTimers()

  const result = await fn()

  jest.useFakeTimers()
  setSystemTime(EPOCH)

  return result
}

export async function getAllRecords (table: PgTable) {
  const records = await db.conn.select().from(table)

  return records
}

export async function findById<T extends TableWithId> (
  table: T,
  id: T['$inferSelect']['id'],
): Promise<InferSelectModel<T> | null> {
  const records = (
    await db.conn
      .select()
      .from(table as PgTable)
      .where(eq(table.id, id))
  ) as InferSelectModel<T>[]

  return records[0] ?? null
}
