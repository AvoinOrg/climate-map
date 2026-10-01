/** @jest-environment node */
import { transform } from 'esbuild'
import { runInNewContext } from 'node:vm'
import { readFileSync } from 'node:fs'
import {
  createStartPublicEnvDiagnosticReporter,
  getStartPublicEnvDefines,
  getStartPublicEnvModuleDefines,
  isStartDebugClientBuild,
  isStartPublicEnvKey,
} from './startPublicEnv'

describe('Start public environment exposure', () => {
  it('defines only explicitly public values for client code', () => {
    const oldPublicSentinel = ['NEXT', 'PUBLIC_OLD_SENTINEL'].join('_')
    const defines = getStartPublicEnvDefines({
      PUBLIC_EXAMPLE: 'client-visible',
      PUBLIC_BLANK: '',
      PUBLIC_UNDEFINED: undefined,
      [oldPublicSentinel]: 'old-public-value',
      TOLGEE_API_KEY: 'tolgee-secret',
      TOLGEE_API_URL: 'https://tolgee.example.test',
      ZITADEL_CLIENT_SECRET: 'zitadel-secret',
      ZITADEL_PROJECT_ID: 'server-only-project-id',
      BETTER_AUTH_SECRET: 'better-auth-secret',
    })

    expect(defines).toEqual({
      'process.env.PUBLIC_EXAMPLE': JSON.stringify('client-visible'),
      'process.env.PUBLIC_BLANK': JSON.stringify(''),
    })
  })

  it('matches the settled public prefix and debug flag', () => {
    const oldPublicExample = ['NEXT', 'PUBLIC_EXAMPLE'].join('_')
    expect(isStartPublicEnvKey('PUBLIC_EXAMPLE')).toBe(true)
    expect(isStartPublicEnvKey(oldPublicExample)).toBe(false)
    expect(isStartDebugClientBuild({ PUBLIC_DEBUG_CLIENT_ERRORS: '1' })).toBe(
      true
    )
    expect(isStartDebugClientBuild({ PUBLIC_DEBUG_CLIENT_ERRORS: '0' })).toBe(
      false
    )
  })

  it('diagnoses legacy GeoServer names once and identifies replacements', () => {
    const messages: string[] = []
    const reportDiagnostics = createStartPublicEnvDiagnosticReporter(
      (message) => messages.push(message)
    )
    const env = {
      NEXT_PUBLIC_GEOSERVER_URL: 'legacy-base-value',
      NEXT_PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE:
        'legacy-workspace-value',
    }

    reportDiagnostics(env)
    reportDiagnostics(env)

    expect(messages).toEqual([
      '[GeoServer configuration] NEXT_PUBLIC_GEOSERVER_URL is unsupported; rename it to PUBLIC_GEOSERVER_URL.',
      '[GeoServer configuration] NEXT_PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE is unsupported; rename it to PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE.',
    ])
    expect(messages.join(' ')).not.toContain('legacy-base-value')
    expect(messages.join(' ')).not.toContain('legacy-workspace-value')
  })

  it('keeps canonical values authoritative when stale legacy names coexist', () => {
    const env = {
      PUBLIC_GEOSERVER_URL: 'https://gis.example.test/geoserver',
      PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE: 'forests',
      NEXT_PUBLIC_GEOSERVER_URL: 'https://legacy.example.test/geoserver',
      NEXT_PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE: 'legacy-forests',
    }
    const messages: string[] = []
    const reportDiagnostics = createStartPublicEnvDiagnosticReporter(
      (message) => messages.push(message)
    )

    reportDiagnostics(env)

    expect(getStartPublicEnvDefines(env)).toEqual({
      'process.env.PUBLIC_GEOSERVER_URL': JSON.stringify(
        'https://gis.example.test/geoserver'
      ),
      'process.env.PUBLIC_LUONNONMETSAKARTAT_GEOSERVER_WORKSPACE':
        JSON.stringify('forests'),
    })
    expect(messages).toHaveLength(2)
    expect(messages.join(' ')).not.toContain('legacy.example.test')
    expect(messages.join(' ')).not.toContain('legacy-forests')
  })

  it('reports malformed canonical values without exposing them', () => {
    const messages: string[] = []
    const reportDiagnostics = createStartPublicEnvDiagnosticReporter(
      (message) => messages.push(message)
    )
    const invalidValue = 'https://private.example.test/undefined'

    reportDiagnostics({ PUBLIC_GEOSERVER_URL: invalidValue })
    reportDiagnostics({ PUBLIC_GEOSERVER_URL: invalidValue })

    expect(messages).toHaveLength(1)
    expect(messages[0]).toContain('PUBLIC_GEOSERVER_URL')
    expect(messages[0]).not.toContain(invalidValue)
  })
})

it.each([undefined, '', 'https://configured.example.test/geoserver'])(
  'executes the Energy GeoServer module without a process global (%s)',
  async (value) => {
    const code = readFileSync('src/applets/energy/layers/geoServer.ts', 'utf8')
    const result = await transform(code, {
      format: 'cjs',
      define: getStartPublicEnvModuleDefines({
        code,
        env: { PUBLIC_ENERGIAKARTTA_GEOSERVER_URL: value },
      }),
    })
    const context = {
      module: { exports: {} as { ENERGYMAP_GEOSERVER_URL: string } },
    }
    runInNewContext(result.code, context)
    expect(context.module.exports.ENERGYMAP_GEOSERVER_URL).toBe(
      value || 'https://sandbox.gis.avoin.org/geoserver'
    )
  }
)
it('replaces only explicit public accesses, including unset optional values', () => {
  expect(
    getStartPublicEnvModuleDefines({
      code: 'process.env.PUBLIC_ENERGY_AREA_API_ORIGIN; process.env.PUBLIC_GEOSERVER_URL; process.env.TOLGEE_API_KEY',
      env: {
        PUBLIC_ENERGY_AREA_API_ORIGIN: 'https://areas.example.test',
        TOLGEE_API_KEY: 'private',
      },
    })
  ).toEqual({
    'process.env.PUBLIC_ENERGY_AREA_API_ORIGIN': '"https://areas.example.test"',
    'process.env.PUBLIC_GEOSERVER_URL': 'undefined',
  })
})
