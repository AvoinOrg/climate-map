/** @jest-environment node */
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import {
  getEnergyAreaApiConfig,
  isAreaTileTemplate,
  resolveEnergyAreaApiConfig,
} from 'applets/energy/common/areas/config'
import { getStartPublicEnvDefines } from '../../../../../utils/config/startPublicEnv'

const config = resolveEnergyAreaApiConfig({
  origin: ' https://api.example.test/ ',
})
test('origin-only config normalizes while missing and invalid states remain explicit', () => {
  expect(config).toEqual({
    ok: true,
    config: { origin: 'https://api.example.test' },
  })
  for (const origin of [undefined, '', ' '])
    expect(resolveEnergyAreaApiConfig({ origin })).toMatchObject({
      ok: false,
      problem: { kind: 'not-configured' },
    })
  for (const origin of [
    'relative',
    'ftp://example.test',
    'https://user:secret@example.test',
    'https://example.test/api',
    'https://example.test?',
    'https://example.test#',
    'https://example.test/?a=1',
    'https:\\example.test',
    'https://example.test/a/..',
  ])
    expect(resolveEnergyAreaApiConfig({ origin })).toMatchObject({
      ok: false,
      problem: { kind: 'invalid-config' },
    })
  const before = process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
  delete process.env.PUBLIC_ENERGY_AREA_API_ORIGIN
  expect(getEnergyAreaApiConfig()).toMatchObject({
    ok: false,
    problem: { kind: 'not-configured' },
  })
  if (before !== undefined) process.env.PUBLIC_ENERGY_AREA_API_ORIGIN = before
})
test('Start public define and unset browser read work without exposing a secret', () => {
  const defines = getStartPublicEnvDefines({
    PUBLIC_ENERGY_AREA_API_ORIGIN: 'https://api.example.test',
    TOLGEE_API_KEY: 'hidden',
  })
  expect(defines).toEqual({
    'process.env.PUBLIC_ENERGY_AREA_API_ORIGIN': '"https://api.example.test"',
  })
  const source = readFileSync(
    'src/applets/energy/common/areas/config.ts',
    'utf8'
  )
  for (const configured of [false, true]) {
    const input = configured
      ? source.replaceAll(
          'process.env.PUBLIC_ENERGY_AREA_API_ORIGIN',
          defines['process.env.PUBLIC_ENERGY_AREA_API_ORIGIN']
        )
      : source
    const code = ts.transpileModule(input, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText
    const exports: { getEnergyAreaApiConfig?: typeof getEnergyAreaApiConfig } =
      {}
    runInNewContext(code, { exports, require: () => ({}), URL })
    expect(exports.getEnergyAreaApiConfig?.()).toMatchObject(
      configured
        ? { ok: true }
        : { ok: false, problem: { kind: 'not-configured' } }
    )
  }
})
test('tile templates keep absolute spelling, escapes and placeholders in paths/queries', () => {
  const absolute =
    'https://TILES.example.test:443/gwc/fixture%3Aareas@EPSG%3A900913/{z}/{x}/{y}.pbf?row={y}&x={x}&other=%2F'
  expect(isAreaTileTemplate(absolute)).toBe(true)
  for (const template of [
    '//elsewhere.test/{z}/{x}/{y}',
    'tiles/{z}/{x}/{y}',
    'javascript:{z}/{x}/{y}',
    'https://u:p@example.test/{z}/{x}/{y}',
    '/tiles/{z}/{x}/missing',
    '/tiles/{z}/{x}/{y}#fragment',
  ])
    expect(isAreaTileTemplate(template)).toBe(false)
})
