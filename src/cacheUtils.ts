import * as cache from '@actions/cache'
import * as core from '@actions/core'
import {HttpClient} from '@actions/http-client'
import {execSh, execCommand} from './execUtils'
import * as Path from 'path'
import {existsSync} from 'fs'
import {throwErr, logTimeTaken} from './utils'

const env = process.env
const CACHE_KEY_TOKENS_SEP = '___'
const http = new HttpClient(undefined, undefined, {
  headers: {'User-Agent': 'Github action', Authorization: `token ${env.GITHUB_TOKEN}`}
})
type GithubCacheEntry = {
  id: number
  ref: string
  key: string
  version: string
  last_accessed_at: string
  created_at: string
  size_in_bytes: number
}

const isNixEvalCacheCacheingEnabled = () => core.getBooleanInput('nixEvalCacheCachingEnabled', {required: true})
const isNixStoreCacheingEnabled = () => core.getBooleanInput('nixStoreCachingEnabled', {required: true})

export const getCacheId = async (prefix: string) =>
  [prefix, `${env.RUNNER_OS}/${env.RUNNER_ARCH}`, env.GITHUB_REF_NAME, env.GITHUB_SHA].join(CACHE_KEY_TOKENS_SEP)

// TODO: I think there is a pagination
export const getCaches = async (): Promise<GithubCacheEntry[]> => {
  const result = await http.getJson<{actions_caches: GithubCacheEntry[]}>(
    `${env.GITHUB_API_URL}/repos/${env.GITHUB_REPOSITORY}/actions/caches?sort=created_at`
  )
  return result.result?.actions_caches ?? throwErr('Failed to query github caches')
}

const findBestCacheMatch = async (id: string): Promise<string | null> => {
  const [idealCacheId, caches] = await Promise.all([getCacheId(id), getCaches()])
  const cacheIdTokens = idealCacheId.split(CACHE_KEY_TOKENS_SEP)

  // Filtering caches by id/workflow/action/OS/arch
  const availableCaches = caches
    .map(it => it.key.split(CACHE_KEY_TOKENS_SEP))
    .filter(it => it[0] === cacheIdTokens[0] && it[1] === cacheIdTokens[1])

  if (availableCaches.length === 0) {
    return null
  }

  // Find latest cache for current branch
  const latestCacheForThisBranch = availableCaches.find(it => it[3] === cacheIdTokens[3])
  if (latestCacheForThisBranch !== undefined) {
    return latestCacheForThisBranch.join(CACHE_KEY_TOKENS_SEP)
  }

  // Find latest cache for default branch
  const defaultBranch = await execSh(
    "git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'"
  ).then(it => it.stdout.trim())

  const latestCacheForDefaultBranch = availableCaches.find(it => it[3] === defaultBranch)
  return latestCacheForDefaultBranch !== undefined
    ? latestCacheForDefaultBranch.join(CACHE_KEY_TOKENS_SEP)
    : availableCaches[0]?.join(CACHE_KEY_TOKENS_SEP) ?? null // default to latest cache
}

export const saveNixStore = async (id: string | undefined) => {
  if (isNixStoreCacheingEnabled() && cache.isFeatureAvailable()) {
    const cacheKey = id === undefined ? await getCacheId(`store`) : await getCacheId(`store/${id}`)

    await logTimeTaken('saveNixStore', () => cache.saveCache(['/nix'], cacheKey))
  }
}

export const restoreNixStore = async (id: string | undefined) => {
  if (isNixStoreCacheingEnabled() && cache.isFeatureAvailable()) {
    const cacheKey = id === undefined ? await findBestCacheMatch(`store`) : await findBestCacheMatch(`store/${id}`)
    if (cacheKey !== null) {
      console.log('Using nix store cache:', cacheKey)
      await execSh('sudo mv /nix /nix~ && sudo mkdir -p -m 777 /nix/store && sudo chown $USER -R /nix')
      execSh('sudo rm -rf /nix~')
      await logTimeTaken('restoreNixStore', () => cache.restoreCache(['/nix'], cacheKey))
    }
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
    await logTimeTaken('saveNixEvalCache', () => cache.saveCache([dir], cacheKey))
  }
}

export const restoreNixEvalCache = async () => {
  const dir = getNixEvalCacheDir()
  if (isNixEvalCacheCacheingEnabled() && cache.isFeatureAvailable() && dir) {
    const cacheKey = await findBestCacheMatch('eval')
    if (cacheKey !== null) {
      console.log('Using eval cache:', cacheKey)
      await logTimeTaken('restoreNixEvalCache', () => cache.restoreCache([dir], cacheKey))
    }
  }
}
