import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { createEnergyAreaFixture } = require('./responder.cjs')
// Accept a Playwright Page or BrowserContext; return an explicit cleanup handle.
export const installEnergyAreaFixtureRoutes = async ({
  target,
  fixture = createEnergyAreaFixture(),
}) => {
  const predicate = (url) => fixture.matches(url)
  const handler = async (route) => {
    try {
      const response = await fixture.respond(route.request().url(), {
        method: route.request().method(),
      })
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
