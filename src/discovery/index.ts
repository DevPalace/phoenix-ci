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
  console.info(`Found Hits:\n${hits.map(it => it.attrPath).join('\n')}`)

  const onEvalFinishHandle = onEvalFinish() // Execute onEvalFinish and targets filtering in parallel
  const hitsHandles = hits.map(async hit =>
    checkedHitDecorator.runWithException({...hit, targets: await getTargets(hit)})
  )
  const hitsWithTargets = await logTimeTaken('Hit targets discovery', async () => Promise.all(hitsHandles))

  await onEvalFinishHandle
  const result = hitsWithTargets.filter(it => it.targets.run.length !== 0 || it.targets.build.length !== 0)
  console.info(`These hits will be processed:\n${result.map(it => it.attrPath).join('\n')}`)
  return result
}

export const runDiscovery = async (): Promise<void> => {
  const attrPaths: string[] = core.getInput('attrPaths', {required: true}).split(/,\s*/)

  await Promise.all([restoreNixEvalCache(), restoreNixStore('discovery')])
  const hits = await getHits(getWorkspacePath(), attrPaths, async () => {
    await saveNixEvalCache()
  })
  saveNixStore('discovery')
  core.setOutput('hits', JSON.stringify(hits.map(checkedHitToWorkUnit)))
}
