import { defineConfig } from 'drizzle-kit'
import { requireEnv } from './src/utils'

const port = requireEnv('POSTGRES_PORT')

export default defineConfig({
  dialect: 'postgresql',
  casing: 'snake_case',
  schema: '../orm/src/schema.ts',
  out: './migrations',
  dbCredentials: {
    port: Number.parseInt(port, 10),
    host: requireEnv('POSTGRES_HOST'),
    user: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database: requireEnv('POSTGRES_DB'),
  },
})
