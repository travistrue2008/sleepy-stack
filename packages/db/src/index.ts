import { exec } from './cli'

if (import.meta.main) {
  const args = process.argv.slice(2)
  const [cmd, subCmd, ...rest] = args

  await exec(cmd, subCmd, ...rest)
}
