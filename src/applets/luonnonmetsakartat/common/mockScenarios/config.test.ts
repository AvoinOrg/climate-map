import { afterEach, jest } from '@jest/globals'
import {
  LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED_ENV,
  MOCK_LUONNONMETSAKARTAT_STATE_QUERY_PARAM,
  MOCK_RESET_QUERY_PARAM,
  assertLuonnonmetsakartatMockScenariosAllowed,
  isLuonnonmetsakartatMockScenariosEnabled,
} from './config'

describe('Luonnonmetsakartat mock scenario config', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('exports the canonical public flag and query parameter names', () => {
    expect(LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED_ENV).toBe(
      'PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED'
    )
    expect(MOCK_LUONNONMETSAKARTAT_STATE_QUERY_PARAM).toBe(
      'mockLuonnonmetsakartatState'
    )
    expect(MOCK_RESET_QUERY_PARAM).toBe('mockReset')
  })

  it.each(['1', 'true', 'yes', 'on', ' TRUE '])(
    'enables scenarios for truthy flag value %s',
    (flagValue) => {
      expect(
        isLuonnonmetsakartatMockScenariosEnabled({
          PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED: flagValue,
          NODE_ENV: 'test',
        })
      ).toBe(true)
    }
  )

  it.each([undefined, '', '0', 'false', 'off', 'no'])(
    'keeps scenarios disabled for non-truthy flag value %s',
    (flagValue) => {
      expect(
        isLuonnonmetsakartatMockScenariosEnabled({
          PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED: flagValue,
          NODE_ENV: 'test',
        })
      ).toBe(false)
    }
  )

  it.each(['1', 'true', 'yes', 'on', ' TrUe '])(
    'refuses production scenarios through the runtime getter for %s',
    (flag) => {
      const env = {
        PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED: flag,
        NODE_ENV: 'production',
      }
      expect(() => isLuonnonmetsakartatMockScenariosEnabled(env)).toThrow(
        'mock scenarios cannot be enabled when NODE_ENV=production'
      )
      expect(() => assertLuonnonmetsakartatMockScenariosAllowed(env)).toThrow(
        'mock scenarios cannot be enabled when NODE_ENV=production'
      )
    }
  )

  it.each([undefined, '', '0', 'false', 'off', 'no', 'unknown'])(
    'keeps production scenarios disabled for %s',
    (flag) => {
      expect(
        isLuonnonmetsakartatMockScenariosEnabled({
          PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED: flag,
          NODE_ENV: 'production',
        })
      ).toBe(false)
    }
  )

  it('guards the runtime getter with the default process environment', () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
      PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED: ' ON ',
    })
    expect(() => isLuonnonmetsakartatMockScenariosEnabled()).toThrow(
      'mock scenarios cannot be enabled when NODE_ENV=production'
    )
    process.env.PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED = '0'
    expect(isLuonnonmetsakartatMockScenariosEnabled()).toBe(false)
  })
})
