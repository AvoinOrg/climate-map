import { getRequiredBearerAuthHeader } from './authHeaders'

describe('required bearer header', () => {
  it('passes an opaque access token unchanged in the Authorization header', () => {
    expect(
      getRequiredBearerAuthHeader({
        accessToken: 'opaque.token-value',
        requestName: 'layer update',
      })
    ).toEqual({ Authorization: 'Bearer opaque.token-value' })
  })

  it.each([undefined, ''])('rejects %p with request context', (accessToken) => {
    expect(() =>
      getRequiredBearerAuthHeader({ accessToken, requestName: 'layer update' })
    ).toThrow('Missing access token for layer update')
  })
})
