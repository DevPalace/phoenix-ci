import * as core from '@actions/core'
import {execCommandPipeStderr} from '../execUtils'
import {getWorkspacePath, logTimeTaken} from '../utils'
import {saveNixEvalCache, restoreNixEvalCache, restoreNixStore, saveNixStore} from '../cacheUtils'
import {Hit, checkedHitDecorator, CheckedHit, checkedHitToWorkUnit} from '../types'
import {getTargets} from '../jsEval'
import {buildDrvs} from '../nix'

export const evalFlake = async (flakePath: string, attrPaths: string[]): Promise<Hit[]> => {
  const nixyAttrPaths = `[${attrPaths.map(it => `"${it}"`).join(' ')}]`

  const result = await execCommandPipeStderr('nix', [
    'eval',
    '--impure',
    '--show-trace',
    '--json',
    '--expr',
    `import ${__dirname}/eval.nix "${flakePath}" ${nixyAttrPaths}`
  ])
  return await handleHitDeps(JSON.parse(result.stdout))
}

const handleHitDeps = async (hits: Hit[]): Promise<Hit[]> => {
  const hitsWithDeps = hits.map(async hit => {
    if (hit.findWorkDeps) {
      const drvs = Object.values(hit.findWorkDeps).map(it => it.drvPath)
      await buildDrvs(drvs)
    }
    return hit
  })
  return Promise.all(hitsWithDeps)
}

export const getHits = async (
  flakePath: string,
  attrPaths: string[],
  onEvalFinish: () => Promise<void>
): Promise<CheckedHit[]> => {
  const hits = await logTimeTaken('Nix discovery evaluation', async () => evalFlake(flakePath, attrPaths))

  core.startGroup('Found Hits')
  core.info(hits.map(it => it.attrPath).join('\n'))
  core.endGroup()

  const onEvalFinishHandle = onEvalFinish() // Execute onEvalFinish and targets filtering in parallel

  const result = await logTimeTaken('Searching for work', async () => {
    const hitsHandles = hits.map(async hit =>
      checkedHitDecorator.runWithException({...hit, targets: await getTargets(hit)})
    )
    const hitsWithTargets = await Promise.all(hitsHandles)
    return hitsWithTargets.filter(it => it.targets.run.length !== 0 || it.targets.build.length !== 0)
  })

  core.startGroup('Hits to be processed')
  core.info(result.map(it => it.attrPath).join('\n'))
  core.endGroup()
  await onEvalFinishHandle
  return result
}

export const runDiscovery = async (): Promise<void> => {
  const attrPaths: string[] = core.getInput('attrPaths', {required: true}).split(/,\s*/)

  await logTimeTaken('Restore Caches', async () => Promise.all([restoreNixEvalCache(), restoreNixStore('discovery')]))
  const hits = await getHits(getWorkspacePath(), attrPaths, async () => {
    await saveNixEvalCache()
  })
  await logTimeTaken('Save /nix/store', async () => saveNixStore('discovery'))
  core.setOutput('hits', JSON.stringify(hits.map(checkedHitToWorkUnit)))
}
