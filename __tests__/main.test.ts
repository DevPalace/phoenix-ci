import {getHits} from '../src/discovery'
import {getNixEvalCacheDir} from '../src/cacheUtils'
import * as process from 'process'
import {expect, test} from '@jest/globals'

const discoveryPaths = ['ci.x86_64-linux.default', 'packages.x86_64-linux']
const setInput = (name: string, value: string) =>
  (process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] = value)
//test('execute discovery', () => {
//  process.env['INPUT_JOBSET'] = 'default'
//  process.env['INPUT_TYPE'] = 'discovery'
//  const node = process.execPath
//  const target = path.join(__dirname, '..', 'lib', 'main.js')
//
//  console.log(cp.execFileSync(node, [target], {env: process.env}).toString())
//})

test('getTargetsToBeProcessed', async () => {
  setInput('flake', '.')
  setInput('jobset', 'default')
  setInput('nixStoreCachingEnabled', 'false')
  const result = await getHits(process.cwd(), discoveryPaths)
  expect(result.length).toBeGreaterThan(1)
})

test('getNixEvalCacheDir', async () => {
  const dir = getNixEvalCacheDir()
  console.log({dir})
  expect(dir.length).toBeGreaterThan('/.cache/nix'.length)
})
