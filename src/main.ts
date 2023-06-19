import * as core from '@actions/core'
import {runDiscovery} from './discovery'
import {runWorker} from './worker'

async function run(): Promise<void> {
  const type: string = core.getInput('type')

  try {
    if (type === 'discovery') {
      await runDiscovery()
    } else if (type === 'worker') {
      await runWorker()
    } else {
      core.setFailed(`Unsupported action type "${type}"`)
    }
  } catch (error) {
    console.error(error)
    if (error instanceof Error) core.setFailed(error.message)
    if (error instanceof String) core.setFailed(error as string)
  }
}

run()
