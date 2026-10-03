---
paths:
  - "packages/api/src/db/**/*.ts"
---

# Database

- Unless a task specifies otherwise, every new table gets these columns:
  - `id`: `BIGINT`, identity primary key (auto-generated).
  - `createdAt`: `DATETIME`, defaults to now.
  - `updatedAt`: `DATETIME`, defaults to now.
- Implement this via the shared `BASE_COLUMNS` object in `packages/orm/src/schema.ts`, and spread it into every new `pgTable()` call rather than redeclaring these three columns by hand.

## Field Ordering

We want to order fields by type, however, we want to keep all of the foreign keys together (although there are some exceptions).

1. `id`: this is the
2. Foreign key references
3. Numeric (in order from `smallint` to `bigint`)
4. `VARCHAR(n)`
5. `TIME`
6. `DATE`
7. `DATETIME`

## Schema Changes

Make sure to rebuild the `main`, `test`, and `e2e` databases whenever schema changes happen. This way, we always end with fully-migrated databases.
