import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as Path from 'path'
import {existsSync} from 'fs'

const env = process.env

const isNixEvalCacheCacheingEnabled = () => core.getBooleanInput('nixEvalCacheCachingEnabled', {required: true})
const isNixStoreCacheingEnabled = () => core.getBooleanInput('nixStoreCachingEnabled', {required: true})

type CacheNixStoreIdArg = string | 'discovery'
type CacheKeyId = 'eval-store-discovery' | 'eval-cache-discovery' | `nix-store-${CacheNixStoreIdArg}`

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

// Save/restore caches logic
export const saveNixStore = async (id: CacheNixStoreIdArg) => {
  if (isNixStoreCacheingEnabled() && cache.isFeatureAvailable()) {
    await cache.saveCache(['/nix'], getCacheKeys(`nix-store-${id}`)[0])
  }
}

export const restoreNixStore = async (id: CacheNixStoreIdArg) => {
  if (isNixStoreCacheingEnabled() && cache.isFeatureAvailable()) {
    const cacheKey = await cache.restoreCache(['/nix'], ...getCacheKeys(`nix-store-${id}`))
    core.info(`Cache ${cacheKey} restored`)
  }
}

export const saveNixEvalCache = async () => {
  const dir = getNixEvalCacheDir()
  if (isNixEvalCacheCacheingEnabled() && cache.isFeatureAvailable() && existsSync(dir)) {
    await cache.saveCache([dir], getCacheKeys('eval-cache-discovery')[0])
  }
}

export const restoreNixEvalCache = async () => {
  const dir = getNixEvalCacheDir()
  if (isNixEvalCacheCacheingEnabled() && cache.isFeatureAvailable() && dir) {
    const prefix = 'eval'
    const cacheKey = await cache.restoreCache([dir], ...getCacheKeys('eval-cache-discovery'))
    core.info(`Cache ${cacheKey} restored`)
  }
}
