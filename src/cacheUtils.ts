import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as Path from 'path'
import {existsSync} from 'fs'

const env = process.env

const isNixEvalCacheCacheingEnabled = () => core.getBooleanInput('nixEvalCacheCachingEnabled', {required: true})
const isNixStoreCacheingEnabled = () => core.getBooleanInput('nixStoreCachingEnabled', {required: true})

type CacheIdArg = string | 'discovery'
type CacheKeyId = 'eval-cache-discovery' | `nix-store-${CacheIdArg}`

const getCacheKeys = (id: CacheKeyId): [string, string[]] => {
  const keyBase = `${env.RUNNER_OS}-${env.RUNNER_ARCH}-${id}-`
  const key = `${keyBase}${env.GITHUB_REF_NAME}-${env.GITHUB_SHA}`
  const keyWithoutSha = `${keyBase}${env.GITHUB_REF_NAME}-`
  return [key, [keyWithoutSha, keyBase]]
}

export const getNixEvalCacheDir = (): string => {
  const xdgCacheHome = env.XDG_CACHE_HOME
  return xdgCacheHome ? Path.join(xdgCacheHome, 'nix') : Path.join(env.HOME ?? '', '.cache/nix')
}

const saveCache = async (id: CacheKeyId, path: string) => {
  if (cache.isFeatureAvailable()) {
    await cache.saveCache([path], getCacheKeys(id)[0])
  }
}

const restoreCache = async (id: CacheKeyId, path: string) => {
  if (cache.isFeatureAvailable()) {
    const cacheKey = await cache.restoreCache([path], ...getCacheKeys(id))
    core.info(`Cache ${cacheKey} restored`)
  }
}

// Save/restore caches logic
export const saveNixStore = async (id: CacheIdArg) =>
  isNixStoreCacheingEnabled() && saveCache(`nix-store-${id}`, '/nix')

export const restoreNixStore = async (id: CacheIdArg) =>
  isNixStoreCacheingEnabled() && restoreCache(`nix-store-${id}`, '/nix')

export const saveNixEvalCache = async () => {
  const dir = getNixEvalCacheDir()
  isNixEvalCacheCacheingEnabled() && existsSync(dir) && (await saveCache('eval-cache-discovery', dir))
}

export const restoreNixEvalCache = async () => {
  const dir = getNixEvalCacheDir()
  isNixEvalCacheCacheingEnabled() && (await restoreCache('eval-cache-discovery', dir))
}
