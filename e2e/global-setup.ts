import { truncateTables } from './utils/db'

export default async function globalSetup () {
  await truncateTables()
}
