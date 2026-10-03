import * as orm from '@example/orm'
import { SQL } from 'bun'
import { BunSQLDatabase, drizzle } from 'drizzle-orm/bun-sql'
import { requireEnv } from '../utils'

type Conn = BunSQLDatabase<Record<string, never>> & { $client: SQL }

export type Transaction = Parameters<Parameters<Conn['transaction']>[0]>[0]

export type QueryOptions = {
  txn?: Transaction
}

let _conn: Conn | null = null

export type * from '@example/orm'

export default {
  /*
   * Lazily constructed so importing a route module doesn't require a
   * reachable database -- tests import handlers before the container is up.
   * Resolving the config here rather than at module scope is part of that: a
   * missing POSTGRES_* should fail the first query, not the import.
   */
  get conn () {
    if (!_conn) {
      _conn = drizzle({
        client: new SQL({
          port: Number.parseInt(requireEnv('POSTGRES_PORT'), 10),
          host: requireEnv('POSTGRES_HOST'),
          user: requireEnv('POSTGRES_USER'),
          password: requireEnv('POSTGRES_PASSWORD'),
          database: requireEnv('POSTGRES_DB'),
        }),
      })
    }

    return _conn
  },
  async close () {
    if (_conn) {
      await _conn.$client.close()
    }

    _conn = null
  },
  ...orm,
}
