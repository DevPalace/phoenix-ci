import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as Path from 'path'
import {existsSync} from 'fs'

const env = process.env
const CACHE_KEY_TOKENS_SEP = '___'

const isNixEvalCacheCacheingEnabled = () => core.getBooleanInput('nixEvalCacheCachingEnabled', {required: true})
const isNixStoreCacheingEnabled = () => core.getBooleanInput('nixStoreCachingEnabled', {required: true})

export const getCacheId = async (prefix: string) =>
  [prefix, `${env.RUNNER_OS}/${env.RUNNER_ARCH}`, env.GITHUB_REF_NAME, env.GITHUB_SHA].join(CACHE_KEY_TOKENS_SEP)

export const saveNixStore = async (id: string | undefined) => {
  if (isNixStoreCacheingEnabled() && cache.isFeatureAvailable()) {
    const cacheKey = id === undefined ? await getCacheId(`store`) : await getCacheId(`store/${id}`)

    await cache.saveCache(['/nix'], cacheKey)
  }
}

const getPrimaryCacheKey = (prefix: string) => {
  return [prefix, `${env.RUNNER_OS}/${env.RUNNER_ARCH}`, env.GITHUB_REF_NAME, env.GITHUB_SHA].join(CACHE_KEY_TOKENS_SEP)
}

const getSecondaryCacheKeys = (prefix: string) => {
  const a = [prefix, `${env.RUNNER_OS}/${env.RUNNER_ARCH}`, env.GITHUB_REF_NAME, ''].join(CACHE_KEY_TOKENS_SEP)
  const b = [prefix, `${env.RUNNER_OS}/${env.RUNNER_ARCH}`, ''].join(CACHE_KEY_TOKENS_SEP)
  return [a, b]
}

export const restoreNixStore = async (id: string | undefined) => {
  if (isNixStoreCacheingEnabled() && cache.isFeatureAvailable()) {
    const prefix = id === undefined ? `store` : `store/${id}`
    const cacheKey = await cache.restoreCache(['/nix'], getPrimaryCacheKey(prefix), getSecondaryCacheKeys(prefix))
    core.info(`Cache ${cacheKey} restored`)
  }
}

// Eval cache
export const getNixEvalCacheDir = (): string => {
  const xdgCacheHome = env.XDG_CACHE_HOME
  return xdgCacheHome ? Path.join(xdgCacheHome, 'nix') : Path.join(env.HOME ?? '', '.cache/nix')
}

export const saveNixEvalCache = async () => {
  const dir = getNixEvalCacheDir()
  if (isNixEvalCacheCacheingEnabled() && cache.isFeatureAvailable() && existsSync(dir)) {
    const cacheKey = await getCacheId('eval')
    await cache.saveCache([dir], cacheKey)
  }
}

export const restoreNixEvalCache = async () => {
  const dir = getNixEvalCacheDir()
  if (isNixEvalCacheCacheingEnabled() && cache.isFeatureAvailable() && dir) {
    const prefix = 'eval'
    const cacheKey = await cache.restoreCache([dir], getPrimaryCacheKey(prefix), getSecondaryCacheKeys(prefix))
    core.info(`Cache ${cacheKey} restored`)
  }
}
