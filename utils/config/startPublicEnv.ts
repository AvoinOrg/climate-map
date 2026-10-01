import {
  LEGACY_PUBLIC_GEOSERVER_URL_ENV,
  LEGACY_PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE_ENV,
  PUBLIC_GEOSERVER_URL_ENV,
  PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE_ENV,
  normalizePublicGeoServerBase,
  normalizePublicGeoServerWorkspace,
} from '../../src/common/config/publicGeoServer'

export const PUBLIC_ENV_PREFIX = 'PUBLIC_'

export type StartLoadedEnv = Record<string, string | undefined>

export const isStartPublicEnvKey = (key: string) =>
  key.startsWith(PUBLIC_ENV_PREFIX)

export const getStartPublicEnvDefines = (env: StartLoadedEnv) =>
  Object.fromEntries(
    Object.entries(env)
      .filter(
        (entry): entry is [string, string] =>
          isStartPublicEnvKey(entry[0]) && entry[1] !== undefined
      )
      .map(([key, value]) => [`process.env.${key}`, JSON.stringify(value)])
  )

// Vite's dev client skips the define transform and initializes dotted defines
// through @vite/client instead. Modules must also work before that global runs.
export const getStartPublicEnvModuleDefines = ({
  code,
  env,
}: {
  code: string
  env: StartLoadedEnv
}) =>
  Object.fromEntries(
    [...new Set(code.match(/process\.env\.PUBLIC_[A-Z0-9_]+\b/g) ?? [])].map(
      (key) => [
        key,
        JSON.stringify(env[key.slice('process.env.'.length)]) ?? 'undefined',
      ]
    )
  )

export const isStartDebugClientBuild = (env: StartLoadedEnv) =>
  env.PUBLIC_DEBUG_CLIENT_ERRORS === '1'

type StartPublicEnvDiagnostic = {
  id: string
  message: string
}

const getStartGeoServerDiagnostics = (
  env: StartLoadedEnv
): StartPublicEnvDiagnostic[] => {
  const diagnostics: StartPublicEnvDiagnostic[] = []

  if (env[LEGACY_PUBLIC_GEOSERVER_URL_ENV] !== undefined) {
    diagnostics.push({
      id: 'legacy-public-geoserver-url',
      message: `${LEGACY_PUBLIC_GEOSERVER_URL_ENV} is unsupported; rename it to ${PUBLIC_GEOSERVER_URL_ENV}.`,
    })
  }
  if (
    env[LEGACY_PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE_ENV] !== undefined
  ) {
    diagnostics.push({
      id: 'legacy-public-luonnonmetsakartat-geoserver-workspace',
      message: `${LEGACY_PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE_ENV} is unsupported; rename it to ${PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE_ENV}.`,
    })
  }

  if (env[PUBLIC_GEOSERVER_URL_ENV] !== undefined) {
    const baseResult = normalizePublicGeoServerBase(
      env[PUBLIC_GEOSERVER_URL_ENV]
    )
    if (!baseResult.ok) {
      diagnostics.push({
        id: `canonical-${baseResult.problem.id}`,
        message: baseResult.problem.message,
      })
    }
  }

  if (env[PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE_ENV] !== undefined) {
    const workspaceResult = normalizePublicGeoServerWorkspace(
      env[PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE_ENV]
    )
    if (!workspaceResult.ok) {
      diagnostics.push({
        id: `canonical-${workspaceResult.problem.id}`,
        message: workspaceResult.problem.message,
      })
    }
  }

  return diagnostics
}

export const createStartPublicEnvDiagnosticReporter = (
  diagnostic: (message: string) => void
) => {
  const reportedDiagnosticIds = new Set<string>()

  return (env: StartLoadedEnv) => {
    for (const problem of getStartGeoServerDiagnostics(env)) {
      if (reportedDiagnosticIds.has(problem.id)) {
        continue
      }

      reportedDiagnosticIds.add(problem.id)
      diagnostic(`[GeoServer configuration] ${problem.message}`)
    }
  }
}

export const reportStartPublicEnvDiagnostics =
  createStartPublicEnvDiagnosticReporter((message) => console.warn(message))
