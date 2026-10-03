/* set env vars here */

const workerId = process.env.BUN_TEST_WORKER_ID ?? '1'

process.env.POSTGRES_DB = `test_${workerId}`

/* imports start here */

import { jest, setSystemTime, beforeEach, afterEach } from 'bun:test'
import { EPOCH, setup, teardown } from './test-helpers'

beforeEach(async () => {
  jest.useFakeTimers()
  setSystemTime(EPOCH)

  await setup()
})

afterEach(async () => {
  setSystemTime()
  jest.useRealTimers()

  await teardown()
})
