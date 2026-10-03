import db from '../../db'
import { StatusCode } from 'sleepy-serv'

import type { AsyncHandlerResult } from 'sleepy-serv'

export default async function handler (): AsyncHandlerResult {
  try {
    await db.conn.$client`SELECT 1 + 1`

    return Response.json(null, {
      status: StatusCode.NoContent,
    })
  } catch {
    return Response.json(null, {
      status: StatusCode.ServiceUnavailable,
    })
  }
}
