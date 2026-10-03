import db from '../../../db'
import { eq } from 'drizzle-orm'
import { StatusCode } from 'sleepy-serv'

import type { Request, AsyncHandlerResult } from 'sleepy-serv'

export default async function handler (req: Request): AsyncHandlerResult {
  const id = Number.parseInt(req.params.itemId!, 10)

  if (Number.isNaN(id)) {
    return Response.json(
      { error: 'itemId must be a number' },
      { status: StatusCode.BadRequest },
    )
  }

  const [item] = await db.conn
    .select()
    .from(db.items)
    .where(eq(db.items.id, id))

  if (!item) {
    return Response.json(
      { error: 'item not found' },
      { status: StatusCode.NotFound },
    )
  }

  return Response.json(item, {
    status: StatusCode.Ok,
  })
}
