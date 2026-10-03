import {
  pgTable,
  bigint,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const BASE_COLUMNS = {
  id: (
    bigint('id', { mode: 'number' })
      .primaryKey()
      .generatedAlwaysAsIdentity()
  ),
  createdAt: (
    timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  ),
  updatedAt: (
    timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
  ),
}

export const items = pgTable('items', {
  id: BASE_COLUMNS.id,
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  createdAt: BASE_COLUMNS.createdAt,
  updatedAt: BASE_COLUMNS.updatedAt,
})

export type Item = typeof items.$inferSelect
