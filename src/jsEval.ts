import * as core from '@actions/core'
import * as nix from './nix'
import * as execUtils from './execUtils'
import {Hit, Targets, targetsDecorator} from './types'

const boilerplate = (body: string) => `
  return async (self, core, nix, execUtils) => {
    ${body}
  }
`

export const getTargets = async (hit: Hit): Promise<Targets> => {
  const result: Object = await Function(boilerplate(hit.findWork))()(hit, core, nix, execUtils)
  return targetsDecorator.runWithException(result)
}
