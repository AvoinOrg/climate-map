import { afterEach, describe, expect, it, jest } from '@jest/globals'

import {
  DEFAULT_MOCK_AUTH_STATE,
  MOCK_AUTH_ACCESS_TOKEN,
  MOCK_AUTH_COOKIE_NAME,
  MOCK_AUTH_MISSING_TOKEN_USER_ID,
  MOCK_AUTH_REJECTED_ACCESS_TOKEN,
  MOCK_AUTH_REJECTED_USER_ID,
  createMockAccessTokenResult,
  createMockAuthSession,
  createMockUserInfo,
  isAuthenticatedMockAuthState,
  isMockAuthEnabled,
  parseMockAuthState,
  resolveMockAuthConfig,
  resolveRequestMockAuthState,
  shouldUseRealAuthForMockState,
  type MockAuthState,
} from './mock'

const createRequest = ({ cookie, url }: { cookie?: string; url: string }) =>
  ({
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'cookie' ? (cookie ?? null) : null,
    },
    url,
  }) as unknown as Request

describe('mock auth helpers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it.each<[string | null | undefined, MockAuthState]>([
    ['authenticated', 'authenticated'],
    ['auth', 'authenticated'],
    ['signed-in', 'authenticated'],
    ['signin', 'authenticated'],
    ['1', 'authenticated'],
    ['true', 'authenticated'],
    ['editor', 'authenticated'],
    ['authenticated-editor', 'authenticated'],
    ['rejected', 'rejected'],
    ['non-editor', 'rejected'],
    ['noneditor', 'rejected'],
    ['missing-token', 'missing-token'],
    ['missing_token', 'missing-token'],
    ['no-token', 'missing-token'],
    ['no-access-token', 'missing-token'],
    ['passthrough', 'passthrough'],
    ['pass-through', 'passthrough'],
    ['real', 'passthrough'],
    ['real-auth', 'passthrough'],
    ['live', 'passthrough'],
    ['unauthenticated', 'unauthenticated'],
    ['anonymous', 'unauthenticated'],
    ['signed-out', 'unauthenticated'],
    ['signout', 'unauthenticated'],
    ['0', 'unauthenticated'],
    ['false', 'unauthenticated'],
    [' Non-Editor ', 'rejected'],
  ])('parses %s as %s', (value, expectedState) => {
    expect(parseMockAuthState(value)).toBe(expectedState)
  })

  it.each([null, undefined, '', 'unknown', 'missingToken'])(
    'returns null for unknown state value %s',
    (value) => {
      expect(parseMockAuthState(value)).toBeNull()
    }
  )

  it('defaults enabled mock auth to the authenticated carbon profile', () => {
    expect(
      resolveMockAuthConfig({
        PUBLIC_MOCK_AUTH_ENABLED: '1',
      })
    ).toEqual({
      enabled: true,
      initialState: DEFAULT_MOCK_AUTH_STATE,
    })

    expect(createMockAccessTokenResult()).toMatchObject({
      ok: true,
      accessToken: MOCK_AUTH_ACCESS_TOKEN,
    })
  })

  it.each<[string, MockAuthState]>([
    ['authenticated', 'authenticated'],
    ['rejected', 'rejected'],
    ['non-editor', 'rejected'],
    ['missing-token', 'missing-token'],
    ['no-token', 'missing-token'],
    ['passthrough', 'passthrough'],
    ['real-auth', 'passthrough'],
    ['unauthenticated', 'unauthenticated'],
  ])('resolves env initial state %s as %s', (envValue, expectedState) => {
    expect(
      resolveMockAuthConfig({
        PUBLIC_MOCK_AUTH_ENABLED: '1',
        PUBLIC_MOCK_AUTH_INITIAL_STATE: envValue,
      })
    ).toMatchObject({
      enabled: true,
      initialState: expectedState,
    })
  })

  it.each(['1', 'true', 'yes', 'on', ' TrUe '])(
    'enables %s in tests but refuses production through runtime auth config/getter',
    (flag) => {
      expect(
        resolveMockAuthConfig({
          PUBLIC_MOCK_AUTH_ENABLED: flag,
          NODE_ENV: 'test',
        }).enabled
      ).toBe(true)
      const env = { PUBLIC_MOCK_AUTH_ENABLED: flag, NODE_ENV: 'production' }
      expect(() => resolveMockAuthConfig(env)).toThrow(
        'Mock auth cannot be enabled when NODE_ENV=production'
      )
      expect(() => isMockAuthEnabled(env)).toThrow(
        'Mock auth cannot be enabled when NODE_ENV=production'
      )
    }
  )

  it.each([undefined, '', '0', 'false', 'no', 'off', 'unknown'])(
    'keeps production auth disabled for %s even with an authenticated initial state',
    (flag) => {
      expect(
        resolveMockAuthConfig({
          PUBLIC_MOCK_AUTH_ENABLED: flag,
          PUBLIC_MOCK_AUTH_INITIAL_STATE: 'authenticated',
          NODE_ENV: 'production',
        })
      ).toEqual({ enabled: false, initialState: 'authenticated' })
    }
  )

  it('guards auth configuration using the default process environment', () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      NODE_ENV: 'production',
      PUBLIC_MOCK_AUTH_ENABLED: ' ON ',
    })
    expect(() => resolveMockAuthConfig()).toThrow(
      'Mock auth cannot be enabled when NODE_ENV=production'
    )
    expect(() => isMockAuthEnabled()).toThrow(
      'Mock auth cannot be enabled when NODE_ENV=production'
    )
    process.env.PUBLIC_MOCK_AUTH_ENABLED = '0'
    expect(resolveMockAuthConfig().enabled).toBe(false)
  })

  it('resolves request state with URL over cookie over env precedence', () => {
    const config = resolveMockAuthConfig({
      PUBLIC_MOCK_AUTH_ENABLED: '1',
      PUBLIC_MOCK_AUTH_INITIAL_STATE: 'missing-token',
    })

    expect(
      resolveRequestMockAuthState({
        config,
        request: createRequest({
          cookie: `${MOCK_AUTH_COOKIE_NAME}=unauthenticated`,
          url: 'https://map.example.org/api/userinfo?mockAuth=passthrough',
        }),
      })
    ).toBe('passthrough')

    expect(
      resolveRequestMockAuthState({
        config,
        request: createRequest({
          cookie: `${MOCK_AUTH_COOKIE_NAME}=real-auth`,
          url: 'https://map.example.org/api/userinfo',
        }),
      })
    ).toBe('passthrough')

    expect(
      resolveRequestMockAuthState({
        config,
        request: createRequest({
          url: 'https://map.example.org/api/userinfo',
        }),
      })
    ).toBe('missing-token')
  })

  it('treats passthrough as live auth instead of an authenticated mock profile', () => {
    expect(shouldUseRealAuthForMockState('passthrough')).toBe(true)
    expect(isAuthenticatedMockAuthState('passthrough')).toBe(false)
    expect(createMockAccessTokenResult('passthrough')).toMatchObject({
      ok: false,
      error: 'NoSession',
    })
  })

  it('creates state-specific rejected and missing-token auth data', () => {
    expect(createMockAuthSession('rejected')).toMatchObject({
      session: {
        userId: MOCK_AUTH_REJECTED_USER_ID,
      },
      user: {
        id: MOCK_AUTH_REJECTED_USER_ID,
      },
      accessToken: MOCK_AUTH_REJECTED_ACCESS_TOKEN,
    })
    expect(createMockAccessTokenResult('rejected')).toMatchObject({
      ok: true,
      accessToken: MOCK_AUTH_REJECTED_ACCESS_TOKEN,
    })
    expect(createMockUserInfo('rejected')).toMatchObject({
      id: MOCK_AUTH_REJECTED_USER_ID,
    })

    const missingTokenSession = createMockAuthSession('missing-token')

    expect(missingTokenSession).toMatchObject({
      session: {
        userId: MOCK_AUTH_MISSING_TOKEN_USER_ID,
      },
      user: {
        id: MOCK_AUTH_MISSING_TOKEN_USER_ID,
      },
    })
    expect(missingTokenSession).not.toHaveProperty('accessToken')
    expect(createMockAccessTokenResult('missing-token')).toMatchObject({
      ok: false,
      error: 'NoAccessToken',
    })
    expect(createMockAccessTokenResult('unauthenticated')).toMatchObject({
      ok: false,
      error: 'NoSession',
    })
  })
})
