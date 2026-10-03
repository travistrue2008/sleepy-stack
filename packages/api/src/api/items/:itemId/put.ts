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

  const body = await req.json() as Record<string, unknown>

  if (
    body.name !== undefined &&
    (
      typeof body.name !== 'string' ||
      body.name.trim().length === 0
    )
  ) {
    return Response.json(
      { error: 'name must be a non-empty string' },
      { status: StatusCode.BadRequest },
    )
  }

  if (
    body.name !== undefined &&
    typeof body.name === 'string' &&
    body.name.length > 255
  ) {
    return Response.json(
      { error: 'name must not exceed 255 characters' },
      { status: StatusCode.BadRequest },
    )
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date(),
  }

  if (typeof body.name === 'string') {
    updates.name = body.name
  }

  if (typeof body.description === 'string') {
    updates.description = body.description
  }

  const [item] = await db.conn
    .update(db.items)
    .set(updates)
    .where(eq(db.items.id, id))
    .returning()

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
