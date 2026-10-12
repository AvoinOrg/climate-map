import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { API_ORIGIN, createEnergyAreaFixture } = require('./responder.cjs')
// Accept a Playwright Page or BrowserContext; return an explicit cleanup handle.
export const installEnergyAreaFixtureRoutes = async ({
  target,
  fixture = createEnergyAreaFixture(),
  apiOrigin = process.env.PUBLIC_ENERGY_AREA_API_ORIGIN ?? API_ORIGIN,
}) => {
  // Bounded browser interception keeps the served sandbox config unchanged.
  const fixtureUrl = (value) => {
    const url = new URL(value)
    if (
      url.origin === apiOrigin &&
      url.pathname.startsWith('/energy-data/areas')
    )
      return new URL(`${url.pathname}${url.search}`, API_ORIGIN)
    return url
  }
  const predicate = (url) => fixture.matches(fixtureUrl(url))
  const handler = async (route) => {
    try {
      const response = await fixture.respond(
        fixtureUrl(route.request().url()).href,
        {
          method: route.request().method(),
        }
      )
      await route.fulfill({
        status: response.status,
        headers: response.headers,
        body: response.body,
      })
    } catch {
      await route.abort('failed')
    }
  }
  await target.route(predicate, handler)
  return { fixture, dispose: () => target.unroute(predicate, handler) }
}
