import pg from 'pg'
import * as schema from '@example/orm'
import { is, getTableName } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { requireEnv } from './env'

const TABLE_NAMES = Object.values(schema)
  .filter(value => is(value, PgTable))
  .map(value => `"${getTableName(value)}"`)

function getConfig () {
  return {
    port: Number.parseInt(requireEnv('POSTGRES_PORT'), 10),
    host: requireEnv('POSTGRES_HOST'),
    user: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database: requireEnv('POSTGRES_DB'),
  }
}

export async function truncateTables (): Promise<void> {
  if (!TABLE_NAMES.length) {
    return
  }

  const client = new pg.Client(getConfig())

  await client.connect()

  try {
    const tables = TABLE_NAMES.join(', ')

    await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
  } finally {
    await client.end()
  }
}
