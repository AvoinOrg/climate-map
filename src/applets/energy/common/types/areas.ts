import type { z } from 'zod'
import type {
  areaDetailSchema,
  areaMetadataSchema,
  areaMetricsSchema,
  areaTilePropertiesSchema,
} from 'applets/energy/common/areas/contract'

export type AreaLevel = 'postal_code' | 'municipality' | 'region'
export type AreaIdentity = {
  level: AreaLevel
  areaCode: string
  areaId: string
}
export type AreaDetailRequest = {
  releaseId: string
  level: AreaLevel
  areaCode: string
  municipalityCode?: string
}
export type AreaMetadata = z.infer<typeof areaMetadataSchema>
export type AreaDetail = z.infer<typeof areaDetailSchema>
export type AreaMetrics = z.infer<typeof areaMetricsSchema>
export type AreaTileProperties = z.infer<typeof areaTilePropertiesSchema>
export type AreaApiProblem = {
  kind:
    | 'not-configured'
    | 'invalid-config'
    | 'unavailable'
    | 'not-found'
    | 'rejected-request'
    | 'malformed-contract'
    | 'unsupported-contract'
    | 'network'
    | 'http'
  status?: number
  // Developer diagnostics only; UI siblings localize by kind.
  diagnostic: string
  issues?: readonly { path: string; code: string }[]
}
export type AreaApiConfig = { origin: string }
export type AreaApiConfigResult =
  | { ok: true; config: AreaApiConfig }
  | { ok: false; problem: AreaApiProblem }
export type AreaFetch = typeof fetch
