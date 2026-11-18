import { config } from 'dotenv'
import { defineConfig, devices } from '@playwright/test'
import { getBaseUrl } from './utils/helpers'
import { requireEnv } from './utils/env'

if (!process.env.CI) {
  config({
    quiet: true,
    path: '.env',
  })
}

process.env.POSTGRES_DB = 'e2e_1'

export default defineConfig({
  workers: 1,
  timeout: 60_000,
  testDir: './tests',
  globalSetup: './global-setup.ts',
  use: {
    baseURL: getBaseUrl(),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
  ...(!process.env.CI && {
    webServer: [
      {
        reuseExistingServer: false,
        cwd: '../packages/api',
        url: `http://localhost:${requireEnv('API_PORT')}/api/health`,
        command: 'bun run --cwd=../db db:reset e2e && bun run dev',
      },
      {
        reuseExistingServer: false,
        command: 'bun run dev',
        cwd: '../packages/ui',
        url: getBaseUrl(),
      },
    ],
  }),
})
