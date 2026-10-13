import { z } from 'zod'
import type {
  AreaDetailRequest,
  AreaLevel,
} from 'applets/energy/common/types/areas'
import { isAreaTileTemplate } from 'applets/energy/common/areas/config'
import { AreaApiError } from 'applets/energy/common/areas/errors'

export const AREA_LEVELS = ['postal_code', 'municipality', 'region'] as const
export const AREA_METRIC_VERSION = 'building-area-summary-v1' as const
const levelSchema = z.enum(AREA_LEVELS)
const count = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)
const coverage = z.number().min(0).max(1).nullable()
const codePatterns: Record<AreaLevel, RegExp> = {
  postal_code: /^[0-9]{5}$/,
  municipality: /^[0-9]{3}$/,
  region: /^[0-9]{2}$/,
}
const jsonObject = z.record(z.string(), z.unknown())
const names = z
  .object({
    fi: z.string().nullable().optional(),
    sv: z.string().nullable().optional(),
    en: z.string().nullable().optional(),
  })
  .passthrough()
const denominators = {
  known_building_count: count,
  unknown_building_count: count,
}
const category = z
  .object({ counts: z.record(z.string(), count), ...denominators })
  .passthrough()
const officialClass = category.extend({
  valid_counts_by_scale: z.record(z.string(), z.record(z.string(), count)),
  eligible_building_count: count,
})
const areaSum = z
  .object({
    sum: z.number().positive().nullable(),
    unit: z.literal('m2'),
    ...denominators,
  })
  .passthrough()
export const areaMetricsSchema = z
  .object({
    energy_class: category.optional(),
    energy_class_source: category.optional(),
    official_class: officialClass.optional(),
    modeled_class: category.optional(),
    modeled_reason: category.optional(),
    heating_method: category.optional(),
    heating_energy_source: category.optional(),
    ventilation: category.optional(),
    main_purpose: category.optional(),
    construction_period: category.optional(),
    floor_area: areaSum.optional(),
    gross_floor_area: areaSum.optional(),
    total_area: areaSum.optional(),
    energy_certificate_heated_net_area: areaSum.optional(),
  })
  .passthrough()
const supportedMetricVersion = z.enum([
  AREA_METRIC_VERSION,
  'building-area-summary-v2',
])
const latestContext = {
  latest: z.literal(true),
  boundary_vintage: count,
  as_of: z.iso.date(),
  metric_version: supportedMetricVersion,
}
const descriptor = z
  .object({
    url: z.string().refine(isAreaTileTemplate),
    source_layer: z
      .string()
      .min(1)
      .refine((v) => !!v.trim()),
    minzoom: z.number().int().min(0).max(25),
    maxzoom: z.number().int().min(0).max(25),
    scheme: z.enum(['xyz', 'tms']).optional(),
  })
  .passthrough()
  .refine((v) => v.minzoom <= v.maxzoom)
export const areaMetadataSchema = z
  .object({
    ...latestContext,
    metric_definitions: jsonObject,
    validation: jsonObject,
    sources: jsonObject,
    layers: z
      .object({
        postal_code: descriptor,
        municipality: descriptor,
        region: descriptor,
      })
      .passthrough(),
    building_filters_supported: z.literal(false),
    postal_areas_nested_in_municipalities: z.literal(false),
  })
  .passthrough()
const identity = {
  level: levelSchema,
  area_code: z.string(),
  area_id: z.string(),
}
const validIdentity = (v: {
  level: AreaLevel
  area_code: string
  area_id: string
}) =>
  codePatterns[v.level].test(v.area_code) &&
  v.area_id === `${v.level}:${v.area_code}`
export const areaDetailSchema = z
  .object({
    ...latestContext,
    ...identity,
    names,
    building_count: count,
    valid_official_class_count: count,
    certificate_coverage: coverage,
    metrics: areaMetricsSchema,
    scope: z
      .object({
        geometry: z.enum(['full_area', 'full_postal_area']),
        municipality_code: z
          .string()
          .regex(codePatterns.municipality)
          .optional(),
      })
      .passthrough(),
    related_area_level: levelSchema,
    related_areas: z.array(
      z.object({ area_code: z.string(), building_count: count }).passthrough()
    ),
    region_code: z.string().regex(codePatterns.region).optional(),
  })
  .passthrough()
  .refine(validIdentity)
  .refine((v) => {
    const relatedLevel =
      v.level === 'municipality' ? 'postal_code' : 'municipality'
    return (
      v.related_area_level === relatedLevel &&
      v.related_areas.every((r) =>
        codePatterns[relatedLevel].test(r.area_code)
      ) &&
      (v.level !== 'municipality' || v.region_code !== undefined)
    )
  })
export const areaTilePropertiesSchema = z
  .object({
    ...identity,
    name_fi: z.string().nullable().optional(),
    name_sv: z.string().nullable().optional(),
    name_en: z.string().nullable().optional(),
    building_count: count,
    valid_official_class_count: count,
    certificate_coverage: coverage.optional(),
  })
  .passthrough()
  .refine(validIdentity)
const requestSchema = z
  .object({
    level: levelSchema,
    areaCode: z.string(),
    municipalityCode: z.string().regex(codePatterns.municipality).optional(),
  })
  .refine(
    (v) =>
      codePatterns[v.level].test(v.areaCode) &&
      (v.municipalityCode === undefined || v.level === 'postal_code')
  )

const validated = <T>({
  schema,
  value,
  input = false,
}: {
  schema: z.ZodType<T>
  value: unknown
  input?: boolean
}): T => {
  const result = schema.safeParse(value)
  if (!result.success)
    throw new AreaApiError({
      kind: input ? 'rejected-request' : 'malformed-contract',
      diagnostic: input
        ? 'Invalid area request identity.'
        : 'Invalid area response contract.',
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        code: issue.code,
      })),
    })
  return result.data
}
export const parseAreaDetailRequest = (value: AreaDetailRequest) =>
  validated({ schema: requestSchema, value, input: true })
const requireVersion = (payload: unknown) => {
  if (
    payload &&
    typeof payload === 'object' &&
    'metric_version' in payload &&
    typeof payload.metric_version === 'string' &&
    !supportedMetricVersion.safeParse(payload.metric_version).success
  ) {
    throw new AreaApiError({
      kind: 'unsupported-contract',
      diagnostic: 'Unsupported area metric version.',
    })
  }
}
const mismatch = () => {
  throw new AreaApiError({
    kind: 'malformed-contract',
    diagnostic: 'Area response does not match its current request.',
  })
}
export const parseAreaMetadata = (payload: unknown) => {
  requireVersion(payload)
  return validated({ schema: areaMetadataSchema, value: payload })
}
export const parseAreaDetail = (
  payload: unknown,
  { request }: { request: AreaDetailRequest }
) => {
  const current = parseAreaDetailRequest(request)
  requireVersion(payload)
  const detail = validated({ schema: areaDetailSchema, value: payload })
  if (
    detail.level !== current.level ||
    detail.area_code !== current.areaCode ||
    detail.scope.municipality_code !== current.municipalityCode ||
    detail.scope.geometry !==
      (current.municipalityCode === undefined
        ? 'full_area'
        : 'full_postal_area')
  )
    mismatch()
  return detail
}
export const parseAreaTileProperties = (
  payload: unknown,
  { level }: { level: AreaLevel }
) => {
  const properties = validated({
    schema: areaTilePropertiesSchema,
    value: payload,
  })
  if (properties.level !== level) mismatch()
  return properties
}
