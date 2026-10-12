// Test-only product-route verification with bounded browser fixtures.
import assert from 'node:assert/strict'
import { checkEnergyAreaNational } from './energy-area-national-checks.mjs'
import { checkEnergyAreaDetails } from './energy-area-details-checks.mjs'
import { installEnergyBuildingFixtureRoutes } from '../../test/energyAreas/buildings.mjs'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from '@playwright/test'
import { installEnergyAreaFixtureRoutes } from '../../test/energyAreas/playwright.mjs'
const require = createRequire(import.meta.url)
const {
  createEnergyAreaFixture,
  createFixtureGate,
} = require('../../test/energyAreas/responder.cjs')
const {
  getChromiumLaunchOptions,
  maybeReexecInsideXvfb,
  assertWebGLAvailable,
} = require('./browserRuntime.js')
assert(
  process.argv.includes('--no-start'),
  'Use the existing doctor-managed runtime'
)
const bootstrap = maybeReexecInsideXvfb({ browserMode: 'xvfb-webgl' })
if (bootstrap.reexecuted) process.exit(bootstrap.exitCode)
const baseUrl =
  process.argv.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] ??
  'http://localhost:6900'
// Browser clicks use localhost; the numeric URL remains valid for server probes.
const captureUrl = new URL(baseUrl)
if (captureUrl.hostname === '127.0.0.1') captureUrl.hostname = 'localhost'
const details = process.argv.includes('--details')
const onlyDetails = process.argv.includes('--details-only')
const onlyGestures = process.argv.includes('--gestures-only')
const requestedLocale = process.argv
  .find((a) => a.startsWith('--locale='))
  ?.split('=')[1]
const requestedViewport = process.argv
  .find((a) => a.startsWith('--viewport='))
  ?.split('=')[1]
const out = path.resolve(
  process.argv.find((a) => a.startsWith('--output='))?.slice(9) ??
    `.dev/visual-regression/energy-area-${details ? 'details' : 'modes'}-${requestedLocale ?? 'all'}-${requestedViewport ?? 'both'}-${Date.now()}`
)
await fs.mkdir(out, { recursive: true })
const noConfiguration = process.argv.includes('--no-area-configuration')
const national = process.argv.includes('--national') || noConfiguration
const scenario =
  process.argv.find((a) => a.startsWith('--scenario='))?.slice(11) ??
  (noConfiguration ? 'missing-origin' : 'normal')
const evidence = {
  command: `node utils/scripts/visual/energy-area-modes-smoke.mjs ${process.argv.slice(2).join(' ')}`,
  fixtureBacked: !noConfiguration && !national,
  routes: [],
  checks: [],
  screenshots: [],
  pageErrors: [],
  consoleErrors: [],
}
const browser = await chromium.launch(
  getChromiumLaunchOptions({ browserMode: 'xvfb-webgl' })
)
const copy = {
  fi: {
    geography: 'Aluetaso',
    metric: 'Alueen väritys',
    region: 'Maakunnat',
    municipality: 'Kunnat',
    postal_code: 'Postinumeroalueet',
    buildings: 'Rakennukset',
    count: 'Rakennusten määrä',
    coverage: 'Voimassa olevien energiatodistusten kattavuus',
    close: 'Sulje aluetiedot',
    refresh: 'Päivitä aluetiedot',
    retry: 'Yritä aluetietoja uudelleen',
    tileRetry: 'Lataa aluekartta uudelleen',
    zoomHint: 'Lähennä karttaa nähdäksesi rakennukset.',
  },
  en: {
    geography: 'Geography',
    metric: 'Area shading',
    region: 'Regions',
    municipality: 'Municipalities',
    postal_code: 'Postal-code areas',
    buildings: 'Buildings',
    count: 'Building count',
    coverage: 'Valid energy certificate coverage',
    close: 'Close area details',
    refresh: 'Refresh area data',
    retry: 'Retry area details',
    tileRetry: 'Retry area tiles',
    zoomHint: 'Zoom in to see buildings.',
  },
}
const assertAutomaticControls = async (page, locale) => {
  assert.equal(
    await page
      .getByRole('combobox', { name: copy[locale].geography, exact: true })
      .count(),
    0
  )
  // Read all mounted surfaces atomically; panel/floating slots may move during
  // sidebar animation and invalidate an indexed Playwright locator.
  const surfaces = await page
    .getByTestId('energy-area-controls')
    .evaluateAll((nodes) =>
      nodes.map((node) => ({
        text: node.textContent,
        statuses: node.querySelectorAll('[role="status"]').length,
      }))
    )
  for (const surface of surfaces) {
    assert.doesNotMatch(
      surface.text,
      /building map remains|rakennuskartta toimii|previously loaded release|aiemmin ladattua|Zoom in to see buildings|Lähennä karttaa nähdäksesi rakennukset/i
    )
    assert.equal(surface.statuses, 0)
  }
}
const snapshot = async (page, name) => {
  if (/^(fi|en)-/.test(name))
    await assertAutomaticControls(page, name.split('-')[0])
  const file = `${name}.png`
  await page.screenshot({ path: path.join(out, file), fullPage: true })
  evidence.screenshots.push({
    file,
    fixtureBacked: !noConfiguration && !national,
    timestamp: new Date().toISOString(),
    state: name,
    locale: name.match(/^(fi|en)-/)?.[1],
    viewport: page.viewportSize(),
    command: evidence.command,
  })
}
const attach = async (page, available = true) => {
  await page.evaluate(async () => {
    const [{ useMapInstanceStore }, { useMapStore }, { useAppletStore }] =
      await Promise.all([
        import('/src/common/store/mapStore/mapInstanceStore.ts'),
        import('/src/common/store/mapStore/mapStore.ts'),
        import('/src/applets/energy/state/appletStore.ts'),
      ])
    // The existing app map and stores; no synthetic second map or product hook.
    window.__energyModesTest = {
      errors: [],
      get map() {
        return useMapInstanceStore.getState()._map
      },
      mapStore: useMapStore,
      appletStore: useAppletStore,
    }
  })
  await page.evaluate(() => {
    const test = window.__energyModesTest
    test.map?.on('error', (event) =>
      test.errors.push({
        sourceId: event.sourceId,
        message: event.error?.message,
        tileKey: event.tile?.tileID?.key,
      })
    )
  })
  await page.waitForFunction(
    (available) =>
      !!window.__energyModesTest.map &&
      (!available ||
        window.__energyModesTest.appletStore.getState().areaAvailable),
    available,
    { timeout: 30000 }
  )
}
const move = async ({ page, zoom, center = [24.94, 60.16] }) => {
  await page.evaluate(
    ({ zoom, center }) => window.__energyModesTest.map.jumpTo({ zoom, center }),
    { zoom, center }
  )
  await page.waitForTimeout(700)
}
const checkGestures = async ({ page, viewportName, fixtureBacked = true }) => {
  const point = { x: page.viewportSize().width - 110, y: 350 }
  const assertRendered = async (expected) => {
    await page.waitForFunction(
      (level) =>
        window.__energyModesTest.appletStore.getState().effectiveGeography ===
        level,
      expected
    )
    await page.waitForTimeout(800)
    await page.waitForFunction(() => !window.__energyModesTest.map.isMoving())
    const actual = await page.evaluate(() => ({
      zoom: window.__energyModesTest.map.getZoom(),
      effective:
        window.__energyModesTest.appletStore.getState().effectiveGeography,
    }))
    assert.equal(actual.effective, expected, JSON.stringify(actual))
    const levels = await page.evaluate(() => [
      ...new Set(
        window.__energyModesTest.map
          .queryRenderedFeatures()
          .filter((f) => f.source.startsWith('energymap_areas_'))
          .map((f) => f.properties?.level)
          .filter(Boolean)
      ),
    ])
    assert.deepEqual(levels, expected === 'buildings' ? [] : [expected])
    return levels
  }
  const bands = [
    [7, 'region', 'municipality'],
    [10, 'municipality', 'postal_code'],
    [12, 'postal_code', 'buildings'],
  ]
  for (const [boundary, below, above] of bands) {
    for (const direction of [1, -1]) {
      await move({ page, zoom: boundary - direction * 0.01 })
      await page.mouse.move(point.x, point.y)
      await page.mouse.wheel(0, -direction * 240)
      const renderedLevels = await assertRendered(
        direction === 1 ? above : below
      )
      evidence.checks.push({
        viewportName,
        gesture: 'wheel',
        boundary,
        direction,
        renderedLevels,
        fixtureBacked,
      })
    }
  }
  if (viewportName === 'mobile') {
    const session = await page.context().newCDPSession(page)
    const pinchPoint = { x: 150, y: 250 }
    const touches = (distance) => [
      { x: pinchPoint.x - distance / 2, y: pinchPoint.y, id: 0 },
      { x: pinchPoint.x + distance / 2, y: pinchPoint.y, id: 1 },
    ]
    for (const [boundary, below, above] of bands) {
      for (const direction of [1, -1]) {
        await move({ page, zoom: boundary - direction * 0.01 })
        const start = direction === 1 ? 50 : 100
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: touches(start),
        })
        for (let step = 1; step <= 5; step++) {
          await session.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: touches(start + direction * step * 10),
          })
          await page.waitForTimeout(40)
        }
        // Hold before release so inertia cannot carry the gesture back across a band.
        await page.waitForTimeout(500)
        evidence.checks.push({
          pinchBeforeRelease: await page.evaluate(() =>
            window.__energyModesTest.map.getZoom()
          ),
          boundary,
          direction,
        })
        await session.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        })
        const renderedLevels = await assertRendered(
          direction === 1 ? above : below
        )
        evidence.checks.push({
          viewportName,
          gesture: 'touch/pinch',
          boundary,
          direction,
          renderedLevels,
          fixtureBacked,
        })
      }
    }
    await session.detach()
  }
}
const choose = async ({ page, label, value }) => {
  await page
    .getByRole('combobox', { name: label, exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await page.getByRole('option', { name: value, exact: true }).click()
  await page.waitForTimeout(150)
}
const clickArea = async ({ page, level, code, center = [24.94, 60.16] }) => {
  await page.waitForFunction(
    ({ level, code }) =>
      window.__energyModesTest.map
        .queryRenderedFeatures()
        .some(
          (feature) =>
            feature.properties?.level === level &&
            feature.properties?.area_code === code
        ),
    { level, code }
  )
  const point = await page.evaluate((center) => {
    const { map } = window.__energyModesTest
    const point = map.project(center)
    const rect = map.getCanvas().getBoundingClientRect()
    return { x: point.x + rect.x, y: point.y + rect.y }
  }, center)
  await page.mouse.move(point.x, point.y)
  await page.waitForTimeout(100)
  const hovered = await page.evaluate(
    ({ level, code }) => {
      const { map } = window.__energyModesTest
      const feature = map
        .queryRenderedFeatures()
        .find(
          (feature) =>
            feature.properties?.level === level &&
            feature.properties?.area_code === code
        )
      return (
        feature &&
        map.getFeatureState({
          source: feature.source,
          sourceLayer: feature.sourceLayer,
          id: feature.id,
        }).hover === true
      )
    },
    { level, code }
  )
  assert.equal(hovered, true, `Hover applies to ${level}:${code}`)
  await page.mouse.click(point.x, point.y)
  await page.getByTestId('energy-area-detail').waitFor({ state: 'visible' })
  const identity = await page.evaluate(() =>
    window.__energyModesTest.mapStore
      .getState()
      .selectedFeatures.map((feature) => ({
        id: feature.id,
        source: feature.source,
        sourceLayer: feature.sourceLayer,
      }))
  )
  assert.equal(identity.length, 1)
  assert.equal(identity[0].id, `${level}:${code}`)
  evidence.checks.push({
    level,
    code,
    identity,
    hoverVerified: true,
    fixtureBacked: true,
  })
}
try {
  evidence.webgl = await assertWebGLAvailable({
    browser,
    browserMode: 'xvfb-webgl',
  })
  if (national) {
    for (const locale of ['en', 'fi'].filter(
      (l) => !requestedLocale || l === requestedLocale
    ))
      for (const viewportName of ['desktop', 'mobile'].filter(
        (v) => !requestedViewport || v === requestedViewport
      ))
        await checkEnergyAreaNational({
          browser,
          captureUrl,
          attach,
          move,
          snapshot,
          evidence,
          copy,
          locale,
          viewportName,
          scenario,
          assertAutomaticControls,
          checkGestures,
        })
  } else {
    for (const locale of process.argv.includes('--lifecycle-only')
      ? []
      : ['en', 'fi'].filter(
          (locale) => !requestedLocale || locale === requestedLocale
        ))
      for (const viewportName of ['desktop', 'mobile'].filter(
        (name) => !requestedViewport || name === requestedViewport
      )) {
        const viewport =
          viewportName === 'desktop'
            ? { width: 1440, height: 900 }
            : { width: 390, height: 844 }
        const context = await browser.newContext({
          viewport,
          hasTouch: viewportName === 'mobile',
        })
        const page = await context.newPage()
        page.on('pageerror', (error) =>
          evidence.pageErrors.push({
            locale,
            viewportName,
            message: error.message,
          })
        )
        page.on('console', (message) => {
          if (message.type() === 'error')
            evidence.consoleErrors.push({
              locale,
              viewportName,
              message: message.text(),
            })
        })
        const buildingFixture = details
          ? await installEnergyBuildingFixtureRoutes({ target: context })
          : undefined
        const fixture = createEnergyAreaFixture()
        await installEnergyAreaFixtureRoutes({ target: context, fixture })
        const response = await page.goto(
          `${captureUrl.origin}/${locale}/energy`,
          {
            waitUntil: 'domcontentloaded',
          }
        )
        assert.equal(response.status(), 200)
        evidence.routes.push({
          locale,
          viewportName,
          status: response.status(),
          delivery: 'tms',
          fixtureBacked: true,
        })
        await attach(page)
        if (onlyDetails) {
          await checkEnergyAreaDetails({
            page,
            fixture,
            locale,
            viewportName,
            copy,
            move,
            choose,
            clickArea,
            snapshot,
            evidence,
            buildingFixture,
          })
          await context.close()
          continue
        }
        await page.getByTestId('energy-area-controls').first().waitFor()
        if (viewportName === 'mobile')
          await page.locator('.sidebar-toggle-button').click()
        await checkGestures({ page, viewportName })
        if (onlyGestures) {
          await snapshot(page, `${locale}-${viewportName}-gestures`)
          await context.close()
          continue
        }
        for (const [level, zoom, code] of [
          ['region', 6, '01'],
          ['municipality', 8, '091'],
          ['postal_code', 11, '00100'],
        ]) {
          await move({
            page,
            zoom,
            center: level === 'municipality' ? [24.98, 60.16] : [24.94, 60.16],
          })
          await snapshot(page, `${locale}-${viewportName}-${level}-map`)
          await clickArea({
            page,
            level,
            code,
            center: level === 'municipality' ? [24.98, 60.16] : [24.94, 60.16],
          })
          await page
            .getByTestId('energy-area-detail')
            .getByText('2026', { exact: true })
            .waitFor()
          await snapshot(page, `${locale}-${viewportName}-${level}-detail`)
          assert(
            !(
              await page.getByTestId('energy-area-detail').innerText()
            ).includes('sidebar.area_map')
          )
          await page
            .getByRole('button', { name: copy[locale].close, exact: true })
            .click()
          if (viewportName === 'mobile')
            await page.locator('.sidebar-toggle-button').click()
        }
        if (viewportName === 'mobile')
          await page
            .locator('[data-testid=energy-area-controls] summary:visible')
            .click()
        await choose({
          page,
          label: copy[locale].metric,
          value: copy[locale].count,
        })
        await snapshot(page, `${locale}-${viewportName}-count-legend`)
        if (viewportName === 'mobile')
          await page
            .locator('[data-testid=energy-area-controls] summary:visible')
            .click()
        await move({ page, zoom: 11 })
        await move({ page, zoom: 11.5 })
        assert.equal(
          await page.evaluate(
            () =>
              window.__energyModesTest.appletStore.getState().effectiveGeography
          ),
          'postal_code'
        )
        await move({ page, zoom: 12 })
        await snapshot(page, `${locale}-${viewportName}-automatic-buildings`)
        evidence.checks.push({
          locale,
          viewportName,
          automaticZoomOnly: true,
          requestCount: fixture.requests.length,
        })
        // Uncached selections prove detail states on the real route.
        await move({ page, zoom: 11 })
        await move({ page, zoom: 11, center: [25.03, 60.16] })
        const gate = createFixtureGate()
        fixture.enqueue({
          match: (url) => url.pathname.endsWith('/postal_code/00200'),
          gate: gate.promise,
        })
        await clickArea({
          page,
          level: 'postal_code',
          code: '00200',
          center: [25.03, 60.16],
        })
        await snapshot(page, `${locale}-${viewportName}-detail-loading`)
        gate.release()
        await page
          .getByTestId('energy-area-detail')
          .getByText('Syntetiskt postområde', { exact: true })
          .waitFor()
        assert.match(
          await page.getByTestId('energy-area-detail').innerText(),
          /0\s?%/
        )
        await snapshot(
          page,
          `${locale}-${viewportName}-valid-zero-name-fallback`
        )
        await page
          .getByRole('button', { name: copy[locale].close, exact: true })
          .click()
        if (viewportName === 'mobile')
          await page.locator('.sidebar-toggle-button').click()
        await move({ page, zoom: 11, center: [25.15, 60.16] })
        await clickArea({
          page,
          level: 'postal_code',
          code: '00300',
          center: [25.15, 60.16],
        })
        await page
          .getByTestId('energy-area-detail')
          .getByText(locale === 'fi' ? '0 rakennusta' : '0 buildings', {
            exact: true,
          })
          .waitFor()
        await snapshot(page, `${locale}-${viewportName}-empty`)
        assert.equal(
          await page
            .getByTestId('building-info-water-resident-control')
            .count(),
          0
        )
        await page
          .getByRole('button', { name: copy[locale].close, exact: true })
          .click()
        if (viewportName === 'mobile')
          await page.locator('.sidebar-toggle-button').click()
        await move({ page, zoom: 11, center: [25.25, 60.16] })
        fixture.enqueue({
          match: (url) => url.pathname.endsWith('/postal_code/00400'),
          response: {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
            body: Buffer.from('{}'),
          },
        })
        await clickArea({
          page,
          level: 'postal_code',
          code: '00400',
          center: [25.25, 60.16],
        })
        await page
          .getByRole('button', { name: copy[locale].retry, exact: true })
          .waitFor()
        await snapshot(page, `${locale}-${viewportName}-not-found`)
        await page
          .getByRole('button', { name: copy[locale].retry, exact: true })
          .click()
        await page
          .getByTestId('energy-area-detail')
          .getByText('2026', { exact: true })
          .waitFor()
        await snapshot(page, `${locale}-${viewportName}-detail-recovered`)
        await page
          .getByRole('button', { name: copy[locale].close, exact: true })
          .click()
        if (viewportName === 'mobile')
          await page.locator('.sidebar-toggle-button').click()
        evidence.checks.push({
          locale,
          viewportName,
          detailLoadingEmptyZeroRetry: true,
          wholeAreaRequests: fixture.requests
            .filter((url) => url.includes('/postal_code/'))
            .every((url) => !url.includes('municipality_code=')),
        })
        if (details)
          await checkEnergyAreaDetails({
            page,
            fixture,
            locale,
            viewportName,
            copy,
            move,
            choose,
            clickArea,
            snapshot,
            evidence,
            buildingFixture,
          })
        await context.close()
      }
    if (!onlyDetails && !onlyGestures) {
      // Release, transport, contract and source lifecycle checks use a fresh route.
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
      })
      const page = await context.newPage()
      page.on('pageerror', (error) =>
        evidence.pageErrors.push({
          scenario: 'lifecycle',
          message: error.message,
        })
      )
      page.on('console', (message) => {
        if (message.type() === 'error')
          evidence.consoleErrors.push({
            scenario: 'lifecycle',
            message: message.text(),
          })
      })
      const fixture = createEnergyAreaFixture()
      await installEnergyAreaFixtureRoutes({ target: context, fixture })
      await page.goto(`${captureUrl.origin}/en/energy`, {
        waitUntil: 'domcontentloaded',
      })
      await attach(page)
      const releaseIds =
        require('../../test/energyAreas/dataset.json').releaseIds
      for (const zoom of [
        6.999, 7, 7.001, 9.999, 10, 10.001, 11.999, 12, 12.001, 12, 11.999, 10,
        9.999, 7, 6.999,
      ]) {
        await move({ page, zoom })
        const expected =
          zoom < 7
            ? 'region'
            : zoom < 10
              ? 'municipality'
              : zoom < 12
                ? 'postal_code'
                : 'buildings'
        assert.equal(
          await page.evaluate(
            () =>
              window.__energyModesTest.appletStore.getState().effectiveGeography
          ),
          expected
        )
        const levels = await page.evaluate(() => [
          ...new Set(
            window.__energyModesTest.map
              .queryRenderedFeatures()
              .filter((feature) =>
                feature.source.startsWith('energymap_areas_')
              )
              .map((feature) => feature.properties?.level)
              .filter(Boolean)
          ),
        ])
        assert(
          levels.every((level) => level === expected),
          `Rendering agrees at zoom ${zoom}`
        )
        if (expected !== 'buildings') assert.deepEqual(levels, [expected])
        evidence.checks.push({
          automaticBoundary: zoom,
          expected,
          renderedLevels: levels,
        })
      }
      await move({ page, zoom: 12 })

      await page
        .getByRole('button', { name: 'Show or hide heating', exact: true })
        .click()
      await page.getByRole('switch').first().click()
      await page
        .getByRole('button', { name: 'Show or hide ventilation', exact: true })
        .click()
      await page.getByRole('switch').first().click()
      await page
        .getByRole('button', {
          name: 'Show or hide energy classes',
          exact: true,
        })
        .click()
      await page.locator('[data-energy-certificate-class=A]').click()
      await page.evaluate(() => {
        const store = window.__energyModesTest.appletStore.getState()
        store.setBuildingTypeFilter('02')
        store.setSelectedConstructionDecade(1980)
        store.setShowOnlySelectedDecade(true)
      })
      const before = await page.evaluate(() => {
        const store = window.__energyModesTest.appletStore.getState()
        return {
          type: store.buildingTypeFilter,
          decade: store.selectedConstructionDecade,
          only: store.showOnlySelectedDecade,
          classes: store.activeEnergyCertificateClasses,
        }
      })
      await move({ page, zoom: 11 })
      await move({ page, zoom: 11 })
      assert.equal(
        await page
          .getByRole('button', { name: 'Show or hide heating', exact: true })
          .getAttribute('aria-disabled'),
        'true'
      )
      // The listed filter accordion lives outside the Energy page.
      await page
        .getByRole('button', { name: 'Change background layers', exact: true })
        .click()
      const typeControl = page.getByRole('combobox', {
        name: 'Select building type',
        exact: true,
      })
      await typeControl.waitFor()
      assert.equal(await typeControl.isDisabled(), true)
      assert.equal(
        await page
          .getByRole('combobox', {
            name: 'Select construction decade',
            exact: true,
          })
          .isDisabled(),
        true
      )
      await snapshot(page, 'en-desktop-listed-filters-inapplicable')
      await page.keyboard.press('Escape')
      evidence.checks.push({
        buildingControlsInapplicable: true,
        listedFiltersDisabled: true,
        before,
      })
      await snapshot(page, 'en-desktop-inapplicable-building-controls')
      const hoverPoint = await page.evaluate(() => {
        const { map } = window.__energyModesTest
        const point = map.project([24.94, 60.16])
        const rect = map.getCanvas().getBoundingClientRect()
        return { x: point.x + rect.x, y: point.y + rect.y }
      })
      await page.mouse.move(hoverPoint.x, hoverPoint.y)
      await page.waitForTimeout(150)
      await snapshot(page, 'en-desktop-postal-hover')
      const gate = createFixtureGate()
      fixture.enqueue({
        match: (url) => url.pathname.endsWith('/postal_code/00100'),
        gate: gate.promise,
        ignoreAbort: true,
      })
      await clickArea({ page, level: 'postal_code', code: '00100' })
      await move({ page, zoom: 11, center: [25.03, 60.16] })
      await clickArea({
        page,
        level: 'postal_code',
        code: '00200',
        center: [25.03, 60.16],
      })
      await page
        .getByTestId('energy-area-detail')
        .getByText('Syntetiskt postområde', { exact: true })
        .waitFor()
      gate.release()
      await page.waitForTimeout(200)
      assert.match(
        await page.getByTestId('energy-area-detail').innerText(),
        /00200/
      )
      await snapshot(page, 'en-desktop-rapid-selection')
      await page
        .getByRole('button', { name: copy.en.close, exact: true })
        .click()
      // A delayed active-metadata response cannot replace a later promoted release.
      const metadataGate = createFixtureGate()
      fixture.setActiveRelease(releaseIds[1])
      fixture.enqueue({
        match: (url) => url.pathname.endsWith('/metadata'),
        gate: metadataGate.promise,
        ignoreAbort: true,
      })
      await page
        .getByRole('button', { name: copy.en.refresh, exact: true })
        .filter({ visible: true })
        .first()
        .click()
      await page.waitForTimeout(150)
      fixture.setActiveRelease(releaseIds[2])
      await page
        .getByRole('button', { name: copy.en.refresh, exact: true })
        .filter({ visible: true })
        .first()
        .click()
      await page.waitForFunction(
        () =>
          Object.keys(window.__energyModesTest.map.getStyle().sources).filter(
            (id) => id.startsWith('energymap_areas_')
          ).length === 3
      )
      metadataGate.release()
      await page.waitForTimeout(150)
      await move({ page, zoom: 11 })
      await clickArea({ page, level: 'postal_code', code: '00100' })
      await page
        .getByTestId('energy-area-detail')
        .getByText('2026', { exact: true })
        .waitFor()
      await snapshot(page, 'en-desktop-release-promoted')
      await move({ page, zoom: 11, center: [24.96, 60.16] })
      const fragments = await page.evaluate(() => {
        const { map } = window.__energyModesTest
        return map
          .queryRenderedFeatures()
          .filter(
            (feature) => feature.properties?.area_id === 'postal_code:00100'
          )
          .map((feature) => ({
            id: feature.id,
            selected:
              map.getFeatureState({
                source: feature.source,
                sourceLayer: feature.sourceLayer,
                id: feature.id,
              }).selected === true,
          }))
      })
      assert(
        fragments.length > 1 && fragments.every((fragment) => fragment.selected)
      )
      evidence.checks.push({ panLoadedFragmentsSelected: true, fragments })
      await snapshot(page, 'en-desktop-selected-fragments-after-pan')
      assert.equal(
        await page.evaluate(() =>
          Object.hasOwn(
            window.__energyModesTest.mapStore.getState().selectedFeatures[0]
              .properties,
            'release_id'
          )
        ),
        false
      )
      assert(fixture.requests.every((url) => !url.includes('release_id')))
      await page
        .getByRole('button', { name: copy.en.close, exact: true })
        .click()
      await page
        .getByRole('button', { name: copy.en.refresh, exact: true })
        .filter({ visible: true })
        .first()
        .click()
      await page.waitForFunction(
        () =>
          Object.values(window.__energyModesTest.map.getStyle().sources).filter(
            (source) => source.promoteId === 'area_id'
          ).length === 3 &&
          Object.values(window.__energyModesTest.map.getStyle().sources)
            .filter((source) => source.promoteId === 'area_id')
            .every((source) => source.scheme === 'tms')
      )
      await page.waitForTimeout(300)
      // The scoped public protocol exposes a real 404 instead of a false empty tile.
      fixture.enqueue({
        match: (url) => url.pathname.includes('_postal_code'),
        response: {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: Buffer.from(''),
        },
      })
      await page.evaluate(() => {
        const { map } = window.__energyModesTest
        map.refreshTiles(
          Object.keys(map.getStyle().sources).find(
            (id) =>
              id.startsWith('energymap_areas_') && id.endsWith('postal_code')
          )
        )
      })
      evidence.transport = await page.evaluate(() => {
        const { map } = window.__energyModesTest
        const source = Object.values(map.getStyle().sources).find(
          (source) =>
            source.promoteId === 'area_id' &&
            source.tiles[0].includes('postal_code')
        )
        const url = source.tiles[0]
          .replaceAll('{z}', '11')
          .replaceAll('{x}', '1166')
          .replaceAll('{y}', '1455')
        return {
          source,
          request: map._requestManager.transformRequest(url, 'Tile'),
        }
      })
      evidence.tileRequests = fixture.requests.slice(-20)
      await page
        .getByRole('button', { name: copy.en.tileRetry, exact: true })
        .waitFor()
      await snapshot(page, 'en-desktop-tile-404')
      await page
        .getByRole('button', { name: copy.en.tileRetry, exact: true })
        .click()
      await page
        .getByRole('button', { name: copy.en.tileRetry, exact: true })
        .waitFor({ state: 'hidden' })
      await snapshot(page, 'en-desktop-tile-recovered')
      // New identities exercise all safe detail error categories on genuine polygons.
      for (const scenario of [
        {
          level: 'municipality',
          code: '009',
          zoom: 8,
          center: [25.15, 60.16],
          kind: 'unsupported',
          transform: (detail) => ({
            ...detail,
            metric_version: 'building-area-summary-v2',
          }),
        },
        {
          level: 'region',
          code: '02',
          zoom: 6,
          center: [25.15, 60.16],
          kind: 'malformed',
          transform: (detail) => ({ ...detail, latest: false }),
        },
        {
          level: 'region',
          code: '03',
          zoom: 6,
          center: [25.25, 60.16],
          kind: 'rejected',
          status: 422,
        },
        {
          level: 'municipality',
          code: '006',
          zoom: 8,
          center: [25.25, 60.16],
          kind: 'unavailable',
          status: 503,
        },
        {
          level: 'region',
          code: '01',
          zoom: 6,
          center: [24.94, 60.16],
          kind: 'network',
          network: true,
        },
      ]) {
        await move({ page, zoom: scenario.zoom, center: scenario.center })
        // Each error case intentionally invalidates any fresh cached visit.
        await page
          .getByRole('button', { name: copy.en.refresh, exact: true })
          .filter({ visible: true })
          .first()
          .click()
        await page.waitForTimeout(100)
        const rule = {
          match: (url) =>
            url.pathname.endsWith(`/${scenario.level}/${scenario.code}`),
          ...(scenario.transform
            ? { transform: scenario.transform }
            : scenario.network
              ? { network: true }
              : {
                  response: {
                    status: scenario.status,
                    headers: {
                      'Content-Type': 'application/json',
                      'Access-Control-Allow-Origin': '*',
                    },
                    body: Buffer.from('{}'),
                  },
                }),
        }
        // Network/503 have the F101.1 bounded retry policy.
        for (
          let attempt = 0;
          attempt < (scenario.network || scenario.status === 503 ? 3 : 1);
          attempt++
        )
          fixture.enqueue(rule)
        await clickArea({
          page,
          level: scenario.level,
          code: scenario.code,
          center: scenario.center,
        })
        await page
          .getByRole('button', { name: copy.en.retry, exact: true })
          .waitFor()
        await snapshot(page, `en-desktop-detail-${scenario.kind}`)
        assert(
          !(await page.getByTestId('energy-area-detail').innerText()).includes(
            releaseIds[2]
          )
        )
        await page
          .getByRole('button', { name: copy.en.retry, exact: true })
          .click()
        await page
          .getByTestId('energy-area-detail')
          .getByText('2026', { exact: true })
          .waitFor()
        await page
          .getByRole('button', { name: copy.en.close, exact: true })
          .click()
      }
      await move({ page, zoom: 12 })
      const after = await page.evaluate(() => {
        const store = window.__energyModesTest.appletStore.getState()
        return {
          type: store.buildingTypeFilter,
          decade: store.selectedConstructionDecade,
          only: store.showOnlySelectedDecade,
          classes: store.activeEnergyCertificateClasses,
        }
      })
      assert.deepEqual(after, before)
      await snapshot(page, 'en-desktop-restored-building-controls')
      // Restore a broad view for a real rendered building click; retained choices
      // above were already asserted, and this explicit reset is test interaction.
      await page.evaluate(() =>
        window.__energyModesTest.appletStore.getState().resetBuildingFilters()
      )
      await move({ page, zoom: 15, center: [24.94, 60.169] })
      await page.waitForFunction(() =>
        window.__energyModesTest.map
          .queryRenderedFeatures()
          .some((feature) => feature.source === 'energymap_building_polygons')
      )
      const buildingPoint = await page.evaluate(() => {
        const { map } = window.__energyModesTest
        for (const feature of map
          .queryRenderedFeatures()
          .filter(
            (feature) =>
              feature.source === 'energymap_building_polygons' &&
              feature.geometry.type === 'Polygon'
          )) {
          const ring = feature.geometry.coordinates[0]
          const center = ring
            .slice(0, -1)
            .reduce(
              (sum, point) => [
                sum[0] + point[0] / (ring.length - 1),
                sum[1] + point[1] / (ring.length - 1),
              ],
              [0, 0]
            )
          const point = map.project(center)
          if (
            point.x > 450 &&
            point.x < 1300 &&
            point.y > 80 &&
            point.y < 790 &&
            map
              .queryRenderedFeatures(point)
              .some(
                (hit) => hit.id === feature.id && hit.source === feature.source
              )
          )
            return { x: point.x, y: point.y }
        }
        throw new Error('No accessible building polygon')
      })
      await page.mouse.click(buildingPoint.x, buildingPoint.y)
      await page
        .getByTestId('building-info-tab-page-basic')
        .waitFor({ state: 'visible' })
      await snapshot(page, 'en-desktop-building-selection-restored')
      evidence.checks.push({
        actualBuildingSelectionRestored: true,
        buildingDelivery: 'existing GeoServer tiles',
        preferencesPreserved: true,
      })
      await page
        .getByRole('button', {
          name: 'Close building information',
          exact: true,
        })
        .click()
      await move({ page, zoom: 11 })
      await move({ page, zoom: 11.5 })
      assert.equal(
        await page.evaluate(
          () =>
            window.__energyModesTest.appletStore.getState().effectiveGeography
        ),
        'postal_code'
      )
      await page.waitForFunction(() =>
        window.__energyModesTest.map
          .queryRenderedFeatures()
          .some((feature) => feature.properties?.area_code === '00100')
      )
      await page.locator('.sidebar-toggle-button').click()
      await page.waitForTimeout(500)
      await snapshot(page, 'en-desktop-fullscreen-sidebar-hidden-postal')
      // Owned registration survives physical style replacement; unrelated store
      // groups remain registered and are not cleared by the Energy owner.
      const otherGroups = await page.evaluate(() =>
        Object.keys(
          window.__energyModesTest.mapStore.getState()._layerGroups
        ).filter((id) => !id.startsWith('energymap_areas_'))
      )
      await page.evaluate(() =>
        window.__energyModesTest.map.setStyle({
          version: 8,
          sources: {},
          layers: [
            {
              id: 'smoke-background',
              type: 'background',
              paint: { 'background-color': '#f0f3f6' },
            },
          ],
        })
      )
      await page.waitForFunction(
        () =>
          Object.keys(window.__energyModesTest.map.getStyle().sources).filter(
            (id) => id.startsWith('energymap_areas_')
          ).length === 3
      )
      assert.deepEqual(
        await page.evaluate(() =>
          Object.keys(
            window.__energyModesTest.mapStore.getState()._layerGroups
          ).filter((id) => !id.startsWith('energymap_areas_'))
        ),
        otherGroups
      )
      await snapshot(page, 'en-desktop-style-recovered')
      await page.evaluate(() =>
        window.__energyModesTest.mapStore.getState().setMapContext('carbon')
      )
      await page.waitForFunction(
        () =>
          !Object.keys(window.__energyModesTest.map.getStyle().sources).some(
            (id) => id.startsWith('energymap_areas_')
          )
      )
      evidence.checks.push({
        rapidSelections: true,
        latestRefresh: true,
        stableDescriptors: true,
        tile404Retry: true,
        detailErrorsRetry: true,
        automaticBands: true,
        fullscreenSidebarHidden: true,
        styleRecovery: true,
        appletExitCleanup: true,
      })
      await context.close()
      for (const scenario of ['no-active', 'unsupported']) {
        const context = await browser.newContext({
          viewport: { width: 390, height: 844 },
        })
        const page = await context.newPage()
        const fixture = createEnergyAreaFixture()
        if (scenario === 'no-active')
          for (let attempt = 0; attempt < 3; attempt++)
            fixture.enqueue({
              match: (url) => url.pathname.endsWith('/metadata'),
              network: true,
            })
        else
          for (let attempt = 0; attempt < 2; attempt++)
            fixture.enqueue({
              match: (url) => url.pathname.endsWith('/metadata'),
              transform: (metadata) => ({
                ...metadata,
                metric_version: 'building-area-summary-v2',
              }),
            })
        await installEnergyAreaFixtureRoutes({ target: context, fixture })
        await page.goto(`${captureUrl.origin}/en/energy`, {
          waitUntil: 'domcontentloaded',
        })
        await attach(page, false)
        await page.waitForTimeout(3500)
        await assertAutomaticControls(page, 'en')
        await move({ page, zoom: 6 })
        assert.equal(
          await page.evaluate(
            () =>
              window.__energyModesTest.appletStore.getState().effectiveGeography
          ),
          'region'
        )
        await snapshot(page, `en-mobile-metadata-${scenario}`)
        await move({ page, zoom: 12 })
        fixture.setActiveRelease(releaseIds[0])
        await page
          .getByRole('button', { name: copy.en.refresh, exact: true })
          .click()
        await page.waitForFunction(
          () => window.__energyModesTest.appletStore.getState().areaAvailable
        )
        assert.equal(
          await page.evaluate(
            () =>
              window.__energyModesTest.appletStore.getState().effectiveGeography
          ),
          'buildings'
        )
        await snapshot(page, `en-mobile-metadata-${scenario}-recovered`)
        await context.close()
      }
    }
  }
  assert.deepEqual(evidence.pageErrors, [])
} catch (error) {
  evidence.failure = error.stack
  const pages = browser.contexts().flatMap((context) => context.pages())
  if (pages.at(-1)) {
    await snapshot(pages.at(-1), 'failure')
    evidence.failureState = await pages.at(-1).evaluate(() => ({
      selected: window.__energyModesTest?.mapStore
        .getState()
        .selectedFeatures.map((feature) => ({
          id: feature.id,
          source: feature.source,
        })),
      effective:
        window.__energyModesTest?.appletStore.getState().effectiveGeography,
      errors: window.__energyModesTest?.errors,
    }))
  }
  throw error
} finally {
  await fs.writeFile(
    path.join(
      out,
      noConfiguration ? 'no-configuration-evidence.json' : 'evidence.json'
    ),
    JSON.stringify(evidence, null, 2)
  )
  await browser.close()
}
console.log(
  JSON.stringify({
    output: out,
    routes: evidence.routes.length,
    checks: evidence.checks.length,
    screenshots: evidence.screenshots.length,
    fixtureBacked: !noConfiguration && !national,
  })
)
