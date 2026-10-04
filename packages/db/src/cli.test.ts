import path from 'node:path'
import dotenv from 'dotenv'
import { mkdirSync, rmSync, readdirSync, writeFileSync } from 'node:fs'

import pg from 'pg'

import {
  setMigrationsFolder,
  getMigrationsFolder,
  exec,
} from './cli'

import {
  afterAll,
  beforeEach,
  afterEach,
  describe,
  test,
  expect,
  spyOn,
} from 'bun:test'

import type { Client } from 'pg'

const MAIN_DB = 'test_db_main'
const TEST_DBS = ['test_1', 'test_2']
const TEST_MAX_WORKERS = process.env.TEST_MAX_WORKERS!
const MAX_WORKERS = Number.parseInt(TEST_MAX_WORKERS, 10)
const ENV_DIR = path.resolve(import.meta.dirname, '..', '.env')

const REAL_MIGRATIONS_DIR = path.resolve(
  import.meta.dirname,
  '..',
  'migrations',
)

const MIGRATIONS_TEST_DIR = path.resolve(
  import.meta.dirname,
  '..',
  'migrations-test',
)

function stringifyConsoleArg (arg: unknown): string {
  if (arg instanceof Error) {
    const causeMessage = arg.cause instanceof Error
      ? ` (cause: ${arg.cause.message})`
      : ''

    return `${arg.message}${causeMessage}`
  }

  return `${arg}`
}

async function runExec (...args: Parameters<typeof exec>) {
  const exitSpy = spyOn(process, 'exit')
    .mockImplementation(() => undefined as never)

  const infoSpy = spyOn(console, 'info').mockImplementation(() => {})
  const errorSpy = spyOn(console, 'error').mockImplementation(() => {})

  await exec(...args)

  const exitCalls = exitSpy.mock.calls.map(call => call[0])
  const exitCode = exitCalls.some(code => code !== 0) ? 1 : (exitCalls[0] ?? 0)

  const stderr = errorSpy.mock.calls
    .map(call => call.map(stringifyConsoleArg).join(' '))
    .join('\n')

  const stdout = infoSpy.mock.calls.map(call => call.join(' ')).join('\n')

  errorSpy.mockRestore()
  infoSpy.mockRestore()
  exitSpy.mockRestore()

  return {
    exitCode,
    stdout,
    stderr,
  }
}

async function runAdminSession<T> (fn: (client: Client) => Promise<T>) {
  const port = Number.parseInt(process.env.POSTGRES_PORT ?? '', 10)

  const client = new pg.Client({
    port,
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: 'postgres',
  })

  await client.connect()

  try {
    return await fn(client)
  } finally {
    await client.end()
  }
}

function databaseExists (name: string) {
  return runAdminSession(async client => {
    const { rowCount } = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [name],
    )

    return (rowCount ?? 0) > 0
  })
}

function createDatabase (name: string) {
  return runAdminSession(client => client.query(`CREATE DATABASE "${name}"`))
}

function dropDatabase (name: string) {
  return runAdminSession(client =>
    client.query(`DROP DATABASE "${name}" WITH (FORCE)`))
}

async function ensureDatabaseAbsent (name: string) {
  const exists = await databaseExists(name)

  if (exists) {
    await dropDatabase(name)
  }
}

async function ensureAllTestDatabasesAbsent () {
  await runAdminSession(async (client) => {
    const { rows } = await client.query<{ datname: string }>(`
SELECT datname
FROM pg_database
WHERE datname ~ '^test_\\d+$'
    `.trim())

    for (const { datname } of rows) {
      await client.query(`DROP DATABASE "${datname}" WITH (FORCE)`)
    }
  })
}

async function allTestDatabasesExist (names: string[]): Promise<boolean> {
  for (const name of names) {
    if (!await databaseExists(name)) {
      return false
    }
  }

  return true
}

function listMigrationFiles () {
  return readdirSync(REAL_MIGRATIONS_DIR).filter(name => name.endsWith('.sql'))
}

describe('migrations folder', () => {
  afterEach(() => {
    setMigrationsFolder('..', 'migrations')
  })

  test('when set', () => {
    const EXPECTED_PATH = path.resolve(
      import.meta.dirname,
      '..',
      '..',
      'other-migrations',
    )

    setMigrationsFolder('..', '..', 'other-migrations')

    const result = getMigrationsFolder()

    expect(result).toBe(EXPECTED_PATH)
  })

  test('when NOT explicitly set', () => {
    const EXPECTED_PATH = path.resolve(import.meta.dirname, '..', 'migrations')

    const result = getMigrationsFolder()

    expect(result).toBe(EXPECTED_PATH)
  })
})

describe('CLI', () => {
  beforeEach(async () => {
    process.env.TEST_MAX_WORKERS = '2'
    process.env.POSTGRES_DB = 'test_db_main'

    await ensureDatabaseAbsent(MAIN_DB)
    await ensureAllTestDatabasesAbsent()
  })

  afterAll(async () => {
    await ensureDatabaseAbsent(MAIN_DB)
    await ensureAllTestDatabasesAbsent()

    dotenv.config({
      quiet: true,
      override: true,
      path: ENV_DIR,
    })

    const dbNames = new Array(MAX_WORKERS)
      .fill('')
      .map((_, index) => `test_${index + 1}`)

    for (const name of dbNames) {
      await createDatabase(name)
      await runExec('migrate', 'up', 'test')
    }
  })

  test('when NO command is provided', async () => {
    const result = await runExec()

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('No command given')
  })

  test('when an INVALID command is provided', async () => {
    const result = await runExec('bogus')

    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain('Unknown command: bogus')
  })

  describe('CMD: database', () => {
    test('when NO sub-command is provided', async () => {
      const result = await runExec('database')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Unknown subcommand')
    })

    test('when an INVALID sub-command is provided', async () => {
      const result = await runExec('database', 'bogus')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Unknown subcommand: bogus')
    })

    describe('SUB-CMD: create', () => {
      test('when target is NOT provided', async () => {
        const result = await runExec('database', 'create')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('requires a target')
      })

      test('when target is INVALID', async () => {
        const result = await runExec('database', 'create', 'bogus')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain("Unknown target 'bogus'")
      })

      describe('"target" = "main"', () => {
        test('when "POSTGRES_DB" is NOT provided', async () => {
          delete process.env.POSTGRES_DB

          const result = await runExec('database', 'create', 'main')

          expect(result.exitCode).toBe(1)
          expect(result.stderr).toContain('POSTGRES_DB is not set')
        })

        test('when "POSTGRES_DB" is NOT a valid database name', async () => {
          process.env.POSTGRES_DB = 'bad name!'

          const result = await runExec('database', 'create', 'main')

          expect(result.exitCode).toBe(1)
          expect(result.stderr).toContain('Invalid database name')
        })

        test('when "POSTGRES_DB" IS a valid database name', async () => {
          const result = await runExec('database', 'create', 'main')

          expect(result.exitCode).toBe(0)
          expect(await databaseExists(MAIN_DB)).toBe(true)
        })
      })

      describe('"target" = "test"', () => {
        test('when TEST_MAX_WORKERS is NOT set', async () => {
          delete process.env.TEST_MAX_WORKERS

          const result = await runExec('database', 'create', 'test')

          expect(result.exitCode).toBe(0)
          expect(await databaseExists('test_1')).toBe(true)
        })

        test('when TEST_MAX_WORKERS is INVALID', async () => {
          process.env.TEST_MAX_WORKERS = 'abc'

          const result = await runExec('database', 'create', 'test')

          expect(result.exitCode).toBe(1)

          expect(result.stderr).toContain(
            'TEST_MAX_WORKERS must be a positive integer',
          )
        })

        test('when the target databases already exist', async () => {
          for (const name of TEST_DBS) {
            await createDatabase(name)
          }

          const result = await runExec('database', 'create', 'test')

          expect(result.exitCode).toBe(0)

          for (const name of TEST_DBS) {
            expect(result.stdout).toContain(`Database '${name}' already exists`)
          }

          expect(await allTestDatabasesExist(TEST_DBS)).toBe(true)
        })

        test('when the existence check returns a null row count', async () => {
          const querySpy = spyOn(pg.Client.prototype, 'query')
            .mockImplementationOnce(() => Promise.resolve({
              rows: [],
              command: 'SELECT',
              rowCount: null,
              oid: 0,
              fields: [],
            }))

          process.env.TEST_MAX_WORKERS = '1'

          const result = await runExec('database', 'create', 'test')

          querySpy.mockRestore()

          expect(result.exitCode).toBe(0)
          expect(result.stdout).toContain("Created database 'test_1'")
          expect(await databaseExists('test_1')).toBe(true)
        })

        test('when invoked', async () => {
          const result = await runExec('database', 'create', 'test')

          expect(result.exitCode).toBe(0)
          expect(await allTestDatabasesExist(TEST_DBS)).toBe(true)
        })
      })
    })

    describe('SUB-CMD: drop', () => {
      test('when target is NOT provided', async () => {
        const result = await runExec('database', 'drop')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('requires a target')
      })

      test('when target is INVALID', async () => {
        const result = await runExec('database', 'drop', 'bogus')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain("Unknown target 'bogus'")
      })

      test('when "main" target name is NOT provided', async () => {
        delete process.env.POSTGRES_DB

        const result = await runExec('database', 'drop', 'main')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('POSTGRES_DB is not set')
      })

      test('when "main" target database DOES NOT exist', async () => {
        const result = await runExec('database', 'drop', 'main')

        expect(result.exitCode).toBe(0)
        expect(await databaseExists(MAIN_DB)).toBe(false)
      })

      test('when "main" target database exists', async () => {
        await createDatabase(MAIN_DB)

        const result = await runExec('database', 'drop', 'main')

        expect(result.exitCode).toBe(0)
        expect(await databaseExists(MAIN_DB)).toBe(false)
      })

      test('when "test" target databases DO NOT exist', async () => {
        const result = await runExec('database', 'drop', 'test')

        expect(result.exitCode).toBe(0)
        expect(await allTestDatabasesExist(TEST_DBS)).toBe(false)
      })

      test('when "test" target databases exist', async () => {
        for (const name of TEST_DBS) {
          await createDatabase(name)
        }

        const result = await runExec('database', 'drop', 'test')

        expect(result.exitCode).toBe(0)

        for (const name of TEST_DBS) {
          expect(await databaseExists(name)).toBe(false)
        }
      })
    })

    describe('SUB-CMD: reset', () => {
      test('when target is NOT provided', async () => {
        const result = await runExec('database', 'reset')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('requires a target')
      })

      test('when target is INVALID', async () => {
        const result = await runExec('database', 'reset', 'bogus')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain("Unknown target 'bogus'")
      })

      test('when "main" target name is NOT provided', async () => {
        delete process.env.POSTGRES_DB

        const result = await runExec('database', 'reset', 'main')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('POSTGRES_DB is not set')
      })

      test('when "main" target IS valid', async () => {
        const result = await runExec('database', 'reset', 'main')

        expect(result.exitCode).toBe(0)
        expect(await databaseExists(MAIN_DB)).toBe(true)

        expect(result.stdout).toContain(
          `Ran migrations for database 'test_db_main'`,
        )
      })

      test('when "test" target invoked', async () => {
        const result = await runExec('database', 'reset', 'test')

        expect(result.exitCode).toBe(0)
        expect(await allTestDatabasesExist(TEST_DBS)).toBe(true)

        for (const name of TEST_DBS) {
          expect(result.stdout).toContain(
            `Ran migrations for database '${name}'`,
          )
        }
      })
    })
  })

  describe('CMD: migrate', () => {
    beforeEach(() => {
      setMigrationsFolder('..', 'migrations-test')

      rmSync(MIGRATIONS_TEST_DIR, {
        recursive: true,
        force: true,
      })

      mkdirSync(path.join(MIGRATIONS_TEST_DIR, 'meta'), { recursive: true })

      writeFileSync(
        path.join(MIGRATIONS_TEST_DIR, 'meta', '_journal.json'),
        JSON.stringify({
          version: '7',
          dialect: 'postgresql',
          entries: [],
        }),
      )
    })

    afterEach(() => {
      setMigrationsFolder('..', 'migrations')

      rmSync(MIGRATIONS_TEST_DIR, {
        recursive: true,
        force: true,
      })
    })

    test('when NO sub-command is provided', async () => {
      const result = await runExec('migrate')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Unknown subcommand')
    })

    test('when an INVALID sub-command is provided', async () => {
      const result = await runExec('migrate', 'bogus')

      expect(result.exitCode).toBe(1)
      expect(result.stderr).toContain('Unknown subcommand: bogus')
    })

    describe('SUB-CMD: up', () => {
      test('when target is NOT provided', async () => {
        const result = await runExec('migrate', 'up')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('requires a target')
      })

      test('when target is INVALID', async () => {
        const result = await runExec('migrate', 'up', 'bogus')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain("Unknown target 'bogus'")
      })

      test('when "main" target name is NOT provided', async () => {
        delete process.env.POSTGRES_DB

        const result = await runExec('migrate', 'up', 'main')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('POSTGRES_DB is not set')
      })

      test('when "main" target database DOES NOT exist', async () => {
        await ensureDatabaseAbsent(MAIN_DB)

        const result = await runExec('migrate', 'up', 'main')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('does not exist')
      })

      test('when "main" target database exists', async () => {
        await createDatabase(MAIN_DB)

        const result = await runExec('migrate', 'up', 'main')

        expect(result.exitCode).toBe(0)

        expect(result.stdout).toContain(
          `Ran migrations for database 'test_db_main'`,
        )
      })

      test('when "test" target databases DO NOT exist', async () => {
        const result = await runExec('migrate', 'up', 'test')

        expect(result.exitCode).toBe(0)
      })

      test('when "test" target databases exist', async () => {
        for (const name of TEST_DBS) {
          await createDatabase(name)
        }

        const result = await runExec('migrate', 'up', 'test')

        expect(result.exitCode).toBe(0)

        for (const name of TEST_DBS) {
          expect(result.stdout).toContain(
            `Ran migrations for database '${name}'`,
          )
        }
      })
    })

    describe('SUB-CMD: down', () => {
      test('when target is NOT provided', async () => {
        const result = await runExec('migrate', 'down')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('requires a target')
      })

      test('when target is INVALID', async () => {
        const result = await runExec('migrate', 'down', 'bogus')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain("Unknown target 'bogus'")
      })

      test('when "main" target name is NOT provided', async () => {
        delete process.env.POSTGRES_DB

        const result = await runExec('migrate', 'down', 'main')

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('POSTGRES_DB is not set')
      })

      test('when "main" target database DOES NOT exist', async () => {
        const result = await runExec('migrate', 'down', 'main')

        expect(result.exitCode).toBe(0)
        expect(await databaseExists(MAIN_DB)).toBe(true)
      })

      test('when "main" target database exists', async () => {
        await createDatabase(MAIN_DB)

        const result = await runExec('migrate', 'down', 'main')

        expect(result.exitCode).toBe(0)
        expect(await databaseExists(MAIN_DB)).toBe(true)
      })

      test('when "test" target databases DO NOT exist', async () => {
        const result = await runExec('migrate', 'down', 'test')

        expect(result.exitCode).toBe(0)
        expect(await allTestDatabasesExist(TEST_DBS)).toBe(true)
      })

      test('when "test" target databases exist', async () => {
        for (const name of TEST_DBS) {
          await createDatabase(name)
        }

        const result = await runExec('migrate', 'down', 'test')

        expect(result.exitCode).toBe(0)
        expect(await allTestDatabasesExist(TEST_DBS)).toBe(true)
      })
    })

    describe('SUB-CMD: generate', () => {
      test('when drizzle-kit exits with a non-zero code', async () => {
        const spawnSpy = spyOn(Bun, 'spawnSync')
          .mockReturnValueOnce({ exitCode: 1 } as never)

        const result = await runExec('migrate', 'generate')

        spawnSpy.mockRestore()

        expect(result.exitCode).toBe(1)
        expect(result.stderr).toContain('exited with code 1')
      })

      test('when invoked', async () => {
        const before = listMigrationFiles()
        const result = await runExec('migrate', 'generate')

        expect(result.exitCode).toBe(0)
        expect(listMigrationFiles()).toStrictEqual(before)
      })
    })
  })
})
