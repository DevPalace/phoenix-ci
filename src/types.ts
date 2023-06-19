import {Decoder, object, string, array, optional, constant, dict} from '@mojotech/json-type-validation'

// Types
export type HitDeps = {
  drvPath: string
  path: string
}
export type Hit = {
  type: 'ci-work-unit'
  findWork: string
  attrPath: string
  findWorkDeps: {[key: string]: HitDeps}
}

export type Targets = {
  build: string[]
  run: string[]
}

export type CheckedHit = Hit & {targets: Targets}

export type WorkUnit = {targets: Targets; attrPath: string}

// Type Decorators
export const targetsDecorator: Decoder<Targets> = object({
  build: optional(array(string())).map(it => it ?? []),
  run: optional(array(string())).map(it => it ?? [])
})
const hitDepsDecorator: Decoder<HitDeps> = object({
  drvPath: string(),
  path: string()
})

export const hitDecorator: Decoder<Hit> = object({
  type: constant('ci-work-unit'),
  findWork: string(),
  attrPath: string(),
  findWorkDeps: dict(hitDepsDecorator)
})

export const checkedHitDecorator: Decoder<CheckedHit> = object({
  type: constant('ci-work-unit'),
  findWork: string(),
  attrPath: string(),
  targets: targetsDecorator,
  findWorkDeps: dict(hitDepsDecorator)
})

export const workUnitDecorator: Decoder<WorkUnit> = object({
  targets: targetsDecorator,
  attrPath: string()
})

// Mappers
export const checkedHitToWorkUnit = (hit: CheckedHit): WorkUnit => {
  return {targets: hit.targets, attrPath: hit.attrPath}
}
