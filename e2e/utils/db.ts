import pg from 'pg'
import * as schema from '@example/orm'
import { is, getTableName } from 'drizzle-orm'
import { PgTable } from 'drizzle-orm/pg-core'

const TABLE_NAMES = Object.values(schema)
  .filter(value => is(value, PgTable))
  .map(value => `"${getTableName(value)}"`)

function getConfig () {
  const port = process.env.POSTGRES_PORT!

  return {
    port: Number.parseInt(port, 10),
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
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
