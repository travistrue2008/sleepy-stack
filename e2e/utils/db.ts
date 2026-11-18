import pg from 'pg'
import * as schema from '@example/orm'
import { is, getTableName } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'
import { requireEnv } from './env'

const TABLE_NAMES = Object.values(schema)
  .filter(value => is(value, PgTable))
  .map(value => `"${getTableName(value)}"`)

function getConfig (database: string) {
  return {
    port: Number.parseInt(requireEnv('POSTGRES_PORT'), 10),
    host: requireEnv('POSTGRES_HOST'),
    user: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database,
  }
}

export async function truncateTables (database: string): Promise<void> {
  if (!TABLE_NAMES.length) {
    return
  }

  const config = getConfig(database)
  const client = new pg.Client(config)

  await client.connect()

  try {
    const tables = TABLE_NAMES.join(', ')

    await client.query(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`)
  } finally {
    await client.end()
  }
}
