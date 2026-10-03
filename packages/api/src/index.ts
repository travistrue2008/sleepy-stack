import { createApp } from 'sleepy-serv'
import { requireEnv } from './utils'

async function main () {
  const API_PORT = Number.parseInt(requireEnv('API_PORT'), 10)

  const app = createApp(API_PORT, {
    mountPath: '/api',
  })

  console.info('Routes:', app.routes)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
