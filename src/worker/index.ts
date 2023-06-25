import * as core from '@actions/core'
import * as nix from '../nix'
import {workUnitDecorator} from '../types'
import {getWorkspacePath, logTimeTaken} from '../utils'
import {restoreNixStore, saveNixStore} from '../cacheUtils'

export const runWorker = async (): Promise<void> => {
  const target = workUnitDecorator.runWithException(JSON.parse(core.getInput('target', {required: true})))
  await logTimeTaken('Restore /nix/store', async () => restoreNixStore(target.attrPath))
  core.startGroup('Execute targets')
  // Execute targets
  const buildHandle = target.targets.build.length !== 0 ? nix.buildAll(getWorkspacePath(), target.targets.build) : null
  const runHandle = target.targets.run.length !== 0 ? nix.runAll(process.cwd(), target.targets.run) : null
  await Promise.all([buildHandle, runHandle])
  core.endGroup()
  await logTimeTaken('Save /nix/store', async () => saveNixStore(target.attrPath))
}
