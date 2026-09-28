/** @jest-environment node */
import { describe, expect, it, jest } from '@jest/globals'

import { handleLuonnonmetsakartatDataProxyRequest } from './dataProxy'
import { ServerRoute } from '#/routes/api/luonnonmetsakartat/$'

jest.mock('@tanstack/react-start/server', () => ({
  createServerFileRoute: (routeId: string) => ({
    methods: (handlers: unknown) => ({ routeId, handlers }),
  }),
}))

// Capture registration only; the applet wrapper and shared HTTP transport are real.
const registration = ServerRoute as unknown as {
  routeId: string
  handlers: Record<string, typeof handleLuonnonmetsakartatDataProxyRequest>
}
const { handlers } = registration

describe('Luonnonmetsakartat Start API registration', () => {
  it('registers exactly the five methods to the real wrapper on the catch-all route', () => {
    expect(registration.routeId).toBe('/api/luonnonmetsakartat/$')
    expect(Object.keys(handlers).sort()).toEqual([
      'DELETE',
      'GET',
      'PATCH',
      'POST',
      'PUT',
    ])
    for (const handler of Object.values(handlers)) {
      expect(handler).toBe(handleLuonnonmetsakartatDataProxyRequest)
    }
  })

  it('round-trips a registered handler through the wrapper and transport with a stub upstream', async () => {
    const fetchFn = jest
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('upstream missing', { status: 404 }))
    const response = await handlers.GET({
      request: new Request(
        'https://map.example.test/api/luonnonmetsakartat/layer/missing?q=A%2BB%20C&empty='
      ),
      deps: {
        env: {
          LUONNONMETSAKARTAT_API_URL: 'https://upstream.example.test/base/',
        },
        fetchFn,
      },
    })
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect(String(fetchFn.mock.calls[0][0])).toBe(
      'https://upstream.example.test/base/layer/missing?q=A%2BB%20C&empty='
    )
    expect(fetchFn.mock.calls[0][1]?.method).toBe('GET')
    expect(response.status).toBe(404)
    expect(await response.text()).toBe('upstream missing')
  })
})
