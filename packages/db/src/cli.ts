import path from 'path'
import pg from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { requireEnv } from './utils'

import type { Client } from 'pg'

type Token = string | undefined

const Target = {
  Main: 'main',
  Test: 'test',
  E2E: 'e2e',
} as const

type Target = (typeof Target)[keyof typeof Target]

const DatabaseSet = {
  New: 'new',
  Existing: 'existing',
} as const

type DatabaseSet = (typeof DatabaseSet)[keyof typeof DatabaseSet]

const IDENTIFIER_PATTERN = /^[a-zA-Z0-9_]+$/
const TARGET_NAMES = Object.values(Target)

const USAGE = `
Usage:
  bun ./src database create <${TARGET_NAMES.join('|')}>
  bun ./src database drop   <${TARGET_NAMES.join('|')}>
  bun ./src database reset  <${TARGET_NAMES.join('|')}>
  bun ./src migrate  up     <${TARGET_NAMES.join('|')}>
  bun ./src migrate  down   <${TARGET_NAMES.join('|')}>
  bun ./src migrate  generate
`.trim()

const CONFIG = path.resolve(
  import.meta.dirname,
  '..',
  'drizzle.config.ts',
)

const BIN = path.resolve(
  import.meta.dirname,
  '..',
  'node_modules',
  '.bin',
  'drizzle-kit',
)

let __migrationsFolder = path.resolve(
  import.meta.dirname,
  '..',
  'migrations',
)

class UsageError extends Error {
  constructor (message: string) {
    super([message, USAGE].join('\n'))

    this.name = 'UsageError'
  }
}

function getConfig (databaseName: string) {
  return {
    port: Number.parseInt(requireEnv('POSTGRES_PORT'), 10),
    host: requireEnv('POSTGRES_HOST'),
    user: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database: databaseName,
  }
}

function getTarget (cmd: Token, subCmd: Token, args: string[]): Target {
  const target = args[0] as Target

  if (!target) {
    throw new UsageError(`'${cmd} ${subCmd}' requires a target`)
  }

  if (!TARGET_NAMES.includes(target)) {
    const names = TARGET_NAMES.join(', ')

    /* eslint-disable-next-line max-len */
    throw new UsageError(`Unknown target '${target}' -- expected one of: ${names}`)
  }

  return target as Target
}

function getMainDatabaseName (): string {
  const name = requireEnv('POSTGRES_DB')

  if (!IDENTIFIER_PATTERN.test(name)) {
    throw new Error(`Invalid database name: '${name}'`)
  }

  return name
}

function getNewTestDatabaseNames (): string[] {
  const raw = process.env.TEST_MAX_WORKERS
  const count = raw ? Number.parseInt(raw, 10) : 1

  if (!Number.isInteger(count) || count < 1) {
    throw new Error('TEST_MAX_WORKERS must be a positive integer')
  }

  return new Array(count).fill(0).map((_, i) => `test_${i + 1}`)
}

function getExistingTestDatabaseNames (): Promise<string[]> {
  return runAdminSession(async client => {
    const { rows } = await client.query<{ datname: string }>(`
SELECT datname
FROM pg_database
WHERE datname ~ '^test_\\d+$'
ORDER BY datname
    `.trim())

    return rows.map(row => row.datname)
  })
}

function getTestDatabaseNames (set: DatabaseSet): Promise<string[]> {
  switch (set) {
    case DatabaseSet.New:
      return Promise.resolve(getNewTestDatabaseNames())

    case DatabaseSet.Existing:
      return getExistingTestDatabaseNames()
  }
}

function getNewE2EDatabaseNames (): string[] {
  const raw = process.env.TEST_MAX_WORKERS
  const count = raw ? Number.parseInt(raw, 10) : 1

  if (!Number.isInteger(count) || count < 1) {
    throw new Error('TEST_MAX_WORKERS must be a positive integer')
  }

  return new Array(count).fill(0).map((_, i) => `e2e_${i + 1}`)
}

function getExistingE2EDatabaseNames (): Promise<string[]> {
  return runAdminSession(async client => {
    const { rows } = await client.query<{ datname: string }>(`
SELECT datname
FROM pg_database
WHERE datname ~ '^e2e_\\d+$'
ORDER BY datname
    `.trim())

    return rows.map(row => row.datname)
  })
}

function getE2EDatabaseNames (set: DatabaseSet): Promise<string[]> {
  switch (set) {
    case DatabaseSet.New:
      return Promise.resolve(getNewE2EDatabaseNames())

    case DatabaseSet.Existing:
      return getExistingE2EDatabaseNames()
  }
}

function getDatabaseNames (
  target: Target,
  set: DatabaseSet,
): Promise<string[]> {
  switch (target) {
    case Target.Main:
      return Promise.resolve([getMainDatabaseName()])

    case Target.Test:
      return getTestDatabaseNames(set)

    case Target.E2E:
      return getE2EDatabaseNames(set)
  }
}

async function runAdminSession<T> (fn: (client: Client) => Promise<T>) {
  const client = new pg.Client(getConfig('postgres'))

  await client.connect()

  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

async function createOneDatabase (
  client: Client,
  name: string,
): Promise<void> {
  const { rowCount } = await client.query(
    'SELECT 1 FROM pg_database WHERE datname = $1',
    [name],
  )

  if ((rowCount ?? 0) > 0) {
    console.info(`Database '${name}' already exists`)

    return
  }

  await client.query(`CREATE DATABASE "${name}"`)

  console.info(`Created database '${name}'`)
}

async function dropOneDatabase (
  client: Client,
  name: string,
): Promise<void> {
  await client.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)

  console.info(`Dropped database '${name}'`)
}

async function migrateOneDatabase (name: string): Promise<void> {
  const db = drizzle({
    connection: getConfig(name),
  })

  await migrate(db, {
    migrationsFolder: __migrationsFolder,
  })

  await db.$client.end()

  console.info(`Ran migrations for database '${name}'`)
}

async function createDatabaseSet (cmd: Token, subCmd: Token, args: string[]) {
  const target = getTarget(cmd, subCmd, args)!
  const dbNames = await getDatabaseNames(target, DatabaseSet.New)

  await runAdminSession(async client => {
    for (const name of dbNames) {
      await createOneDatabase(client, name)
    }
  })
}

async function dropDatabaseSet (cmd: Token, subCmd: Token, args: string[]) {
  const target = getTarget(cmd, subCmd, args)
  const dbNames = await getDatabaseNames(target, DatabaseSet.Existing)

  await runAdminSession(async client => {
    for (const name of dbNames) {
      await dropOneDatabase(client, name)
    }
  })
}

async function migrateUpDatabaseSet (
  cmd: Token,
  subCmd: Token,
  args: string[],
) {
  const target = getTarget(cmd, subCmd, args)
  const dbNames = await getDatabaseNames(target, DatabaseSet.Existing)

  for (const name of dbNames) {
    await migrateOneDatabase(name)
  }
}

async function clearDatabaseSet (cmd: Token, subCmd: Token, args: string[]) {
  await dropDatabaseSet(cmd, subCmd, args)
  await createDatabaseSet(cmd, subCmd, args)
}

async function resetDatabaseSet (cmd: Token, subCmd: Token, args: string[]) {
  await dropDatabaseSet(cmd, subCmd, args)
  await createDatabaseSet(cmd, subCmd, args)
  await migrateUpDatabaseSet(cmd, subCmd, args)
}

function generateMigration () {
  const args = ['generate', '--config', CONFIG]

  const result = Bun.spawnSync([BIN, ...args], {
    /*
     * drizzle-kit resolves drizzle.config.ts's relative `schema`/`out`
     * paths against the CURRENT WORKING DIRECTORY, not the config file's
     * own location -- pin it here so `generate` works no matter where the
     * CLI itself was invoked from.
     */
    cwd: path.dirname(CONFIG),
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(`drizzle-kit generate exited with code ${result.exitCode}`)
  }
}

function processDatabaseCommand (cmd: Token, subCmd: Token, args: string[]) {
  switch (subCmd) {
    case 'create':
      return createDatabaseSet(cmd, subCmd, args)

    case 'drop':
      return dropDatabaseSet(cmd, subCmd, args)

    case 'reset':
      return resetDatabaseSet(cmd, subCmd, args)

    default:
      throw new UsageError(`Unknown subcommand: ${subCmd}`)
  }
}

function processMigrateCommand (cmd: Token, subCmd: Token, args: string[]) {
  switch (subCmd) {
    case 'up':
      return migrateUpDatabaseSet(cmd, subCmd, args)

    case 'down':
      return clearDatabaseSet(cmd, subCmd, args)

    case 'generate':
      return generateMigration()

    default:
      throw new UsageError(`Unknown subcommand: ${subCmd}`)
  }
}

async function dispatch (cmd: Token, subCmd: Token, args: string[]) {
  if (!cmd) {
    throw new UsageError('No command given')
  }

  switch (cmd) {
    case 'database':
      return processDatabaseCommand(cmd, subCmd, args)

    case 'migrate':
      return processMigrateCommand(cmd, subCmd, args)

    default:
      throw new UsageError(`Unknown command: ${cmd}`)
  }
}

export function setMigrationsFolder (...args: string[]) {
  __migrationsFolder = path.resolve(import.meta.dirname, ...args)
}

export function getMigrationsFolder (): string {
  return __migrationsFolder
}

export async function exec (
  cmd?: string,
  subCmd?: string,
  ...args: string[]
): Promise<void> {
  try {
    await dispatch(cmd, subCmd, args)

    process.exit(0)
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}
