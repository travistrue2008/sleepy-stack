import { truncateTables } from './utils/db'
import { getDatabaseName, getWorkerCount } from './utils/helpers'

export default async function globalSetup () {
  for (let offset = 1; offset <= getWorkerCount(); ++offset) {
    const databaseName = getDatabaseName(offset)

    await truncateTables(databaseName)
  }
}
