import * as core from '@actions/core'
import Path from 'path'

export const throwErr = (errorMessage: string): never => {
  throw new Error(errorMessage)
}

export const getFlakeRef = (): string => {
  const flake = core.getInput('flake', {required: true})

  return flake.startsWith('.')
    ? Path.join(process.env.GITHUB_WORKSPACE ?? throwErr("'GITHUB_WORKSPACE' env variable not found"), flake)
    : flake
}

export async function logTimeTaken<T>(name: string, fn: () => Promise<T>): Promise<T> {
  core.startGroup(name)
  console.time(name)
  const result = await fn()
  console.timeEnd(name)
  core.endGroup()
  return result
}
