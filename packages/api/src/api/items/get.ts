import db from '../../db'
import { StatusCode } from 'sleepy-serv'

import type { AsyncHandlerResult } from 'sleepy-serv'

export default async function handler (): AsyncHandlerResult {
  const records = await db.conn
    .select()
    .from(db.items)
    .orderBy(db.items.id)

  return Response.json(records, {
    status: StatusCode.Ok,
  })
}
