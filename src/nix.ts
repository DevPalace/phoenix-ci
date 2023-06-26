import {execCommand, execCommandPipeOutput} from './execUtils'

export const isUncachedDrv = async (drvPath: string): Promise<boolean> => {
  console.log(drvPath)
  return await execCommand('nix-store', ['--realise', '--dry-run', drvPath]).then(it =>
    it.stderr.trim().includes('will be built')
  )
}

export const build = async (flakePath: string, attribute: string): Promise<number> => {
  return await execCommandPipeOutput('nix', ['build', '--no-link', '-L', `${flakePath}#${attribute}`])
}

export const buildDrvs = async (drvPaths: string[]): Promise<number> => {
  const targets = drvPaths.map(it => `${it}^*`)
  return await execCommandPipeOutput('nix', ['build', '--no-link', '-L', ...targets])
}

export const buildAll = async (flakePath: string, attributes: string[]): Promise<number> => {
  const targets = attributes.map(it => `${flakePath}#${it}`)
  return await execCommandPipeOutput('nix', ['build', '--no-link', '-L', ...targets])
}

export const runAll = async (flakePath: string, attributes: string[]): Promise<number[]> => {
  const targets = attributes.map(it => execCommandPipeOutput('nix', ['build', '--no-link', '-L', `${flakePath}#${it}`]))
  return await Promise.all(targets)
}
