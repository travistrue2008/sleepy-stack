import db from '../../db'
import { StatusCode } from 'sleepy-serv'

import type { AsyncHandlerResult } from 'sleepy-serv'

export default async function handler (req: Request): AsyncHandlerResult {
  const body = await req.json() as Record<string, unknown>

  if (
    typeof body.name !== 'string'
    || body.name.trim().length === 0
  ) {
    return Response.json(
      { error: 'name is required and must be a non-empty string' },
      { status: StatusCode.BadRequest },
    )
  }

  if (body.name.length > 255) {
    return Response.json(
      { error: 'name must not exceed 255 characters' },
      { status: StatusCode.BadRequest },
    )
  }

  const description = typeof body.description === 'string'
    ? body.description
    : ''

  const [item] = await db.conn
    .insert(db.items)
    .values({
      name: body.name,
      description,
    })
    .returning()

  return Response.json(item, {
    status: StatusCode.Created,
  })
}
