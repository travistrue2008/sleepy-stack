import { test as base } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { truncateTables } from '../utils/db'
import { requireEnv } from '../utils/env'

import {
  HttpStatus,
  getBaseUrl,
  getDatabaseName,
  getStackUrl,
  sleep,
} from '../utils/helpers'

const HEALTH_INTERVAL_MS = 500
const HEALTH_REQUEST_TIMEOUT_MS = 2_000
const DEFAULT_HEALTH_TIMEOUT_MS = 20_000

const INSPECT_FORMAT = [
  '{{.RestartCount}}',
  '{{.State.Status}}',
  '{{.State.ExitCode}}',
  '{{.State.OOMKilled}}',
].join(' ')

const Service = {
  Api: 'api',
  Ui: 'ui',
} as const

type Service = typeof Service[keyof typeof Service]

const ContainerStatus = {
  Running: 'running',
} as const

type ContainerState = {
  restarts: number
  status: string
  exitCode: number
  oomKilled: boolean
}

type ContainerStates = Record<Service, ContainerState>

type Fixtures = {
  portOffset: number
  _cleanup: void
}

function isContainerRun (): boolean {
  return Boolean(process.env.E2E_COMPOSE_PROJECT_PREFIX)
}

function docker (args: string[]): string {
  return execFileSync('docker', args, { encoding: 'utf8' }).trim()
}

function getContainerId (service: Service, portOffset: number): string {
  const project = `${requireEnv('E2E_COMPOSE_PROJECT_PREFIX')}-${portOffset}`

  const id = docker([
    'ps',
    '--all',
    '--quiet',
    '--filter',
    `label=com.docker.compose.project=${project}`,
    '--filter',
    `label=com.docker.compose.service=${service}`,
  ])

  if (!id) {
    throw new Error(`no ${service} container found in project ${project}`)
  }

  return id
}

function getContainerState (
  service: Service,
  portOffset: number,
): ContainerState {
  const output = docker([
    'inspect',
    '--format',
    INSPECT_FORMAT,
    getContainerId(service, portOffset),
  ])

  const [restarts, status, exitCode, oomKilled] = output.split(' ')

  return {
    status: status!,
    oomKilled: oomKilled === 'true',
    restarts: Number.parseInt(restarts!, 10),
    exitCode: Number.parseInt(exitCode!, 10),
  }
}

function getContainerStates (portOffset: number): ContainerStates {
  return {
    [Service.Api]: getContainerState(Service.Api, portOffset),
    [Service.Ui]: getContainerState(Service.Ui, portOffset),
  }
}

function describeDeath (
  service: Service,
  was: ContainerState,
  now: ContainerState,
): string {
  const exit = now.status !== ContainerStatus.Running
    ? `, exit code ${now.exitCode}`
    : ''

  return [
    `the ${service} container died during this test`,
    `(restarts ${was.restarts} -> ${now.restarts},`,
    `status ${now.status}${exit}, OOM killed ${now.oomKilled})`,
  ].join(' ')
}

function findDeaths (
  before: ContainerStates,
  after: ContainerStates,
): string[] {
  const deaths: string[] = []

  for (const service of Object.values(Service)) {
    const was = before[service]
    const now = after[service]
    const restarted = now.restarts !== was.restarts
    const stopped = now.status !== ContainerStatus.Running

    if (restarted || stopped) {
      deaths.push(describeDeath(service, was, now))
    }
  }

  return deaths
}

function getHealthTimeout (): number {
  const raw = process.env.E2E_HEALTH_TIMEOUT_MS

  return raw ? Number.parseInt(raw, 10) : DEFAULT_HEALTH_TIMEOUT_MS
}

async function isHealthy (url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS),
    })

    return response.status === HttpStatus.NoContent
  } catch {
    return false
  }
}

async function waitUntilHealthy (baseUrl: string): Promise<void> {
  const url = `${baseUrl}/api/health`
  const timeout = getHealthTimeout()
  const deadline = Date.now() + timeout

  while (!await isHealthy(url)) {
    if (Date.now() > deadline) {
      throw new Error([
        `${url} was not healthy after ${timeout}ms;`,
        'an earlier test may have stopped the api or the ui',
      ].join(' '))
    }

    await sleep(HEALTH_INTERVAL_MS)
  }
}

export const test = base.extend<Fixtures>({
  portOffset: async ({}, use, testInfo) => {
    await use(testInfo.parallelIndex + 1)
  },
  baseURL: async ({ portOffset }, use) => {
    await use(isContainerRun() ? getStackUrl(portOffset) : getBaseUrl())
  },
  _cleanup: [
    async ({ browser, portOffset, baseURL }, use) => {
      await waitUntilHealthy(baseURL!)
      await truncateTables(getDatabaseName(portOffset))

      const before = isContainerRun() ? getContainerStates(portOffset) : null

      await use()

      for (const context of browser.contexts()) {
        await context.close()
      }

      if (before) {
        const deaths = findDeaths(before, getContainerStates(portOffset))

        if (deaths.length) {
          throw new Error(deaths.join('\n'))
        }
      }
    }, { auto: true },
  ],
})

export { expect } from '@playwright/test'
