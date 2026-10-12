import type { AreaApiConfigResult } from 'applets/energy/common/types/areas'
import { AreaApiError } from 'applets/energy/common/areas/errors'

export const ENERGY_AREA_API_PREFIX = '/energy-data/areas'

// Keep an explicit property access for Start's public-env replacement. When an
// optional key has no define, a browser without process must still return unset.
export const getEnergyAreaApiConfig = () => {
  let origin: string | undefined
  try {
    origin = process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
  } catch {
    /* unset browser define */
  }
  return resolveEnergyAreaApiConfig({ origin })
}

export const resolveEnergyAreaApiConfig = ({
  origin,
}: {
  origin?: string
}): AreaApiConfigResult => {
  const value = origin?.trim()
  if (!value)
    return {
      ok: false,
      problem: {
        kind: 'not-configured',
        diagnostic: 'PUBLIC_ENERGY_AREA_API_ORIGIN is unset.',
      },
    }
  try {
    const url = new URL(value)
    if (
      !/^https?:$/.test(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      value.includes('?') ||
      value.includes('#') ||
      /[\\\s]/.test(value) ||
      !/^https?:\/\/[^/]+\/?$/i.test(value)
    )
      throw new Error()
    return { ok: true, config: { origin: url.origin } }
  } catch {
    return {
      ok: false,
      problem: {
        kind: 'invalid-config',
        diagnostic:
          'Area API configuration must be an absolute HTTP(S) service origin without credentials, path, query or fragment.',
      },
    }
  }
}

export const requireAreaApiConfig = (result: AreaApiConfigResult) => {
  if (!result.ok) throw new AreaApiError(result.problem)
  // Also protect callers constructing a config result directly.
  const validated = resolveEnergyAreaApiConfig(result.config)
  if (!validated.ok) throw new AreaApiError(validated.problem)
  return validated.config
}

export const isAreaTileTemplate = (value: string) => {
  if (
    /[\\\s]/.test(value) ||
    value.includes('#') ||
    !['{z}', '{x}', '{y}'].every((token) => value.includes(token))
  )
    return false
  const relative = value.startsWith('/') && !value.startsWith('//')
  if (!relative && !/^https?:\/\//i.test(value)) return false
  try {
    const url = new URL(value, 'https://template-validation.example.test')
    return (
      /^https?:$/.test(url.protocol) &&
      !url.username &&
      !url.password &&
      !/[{}]/.test(url.host)
    )
  } catch {
    return false
  }
}
