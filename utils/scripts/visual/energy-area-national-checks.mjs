// Unmocked national-data acceptance, using the existing actual-map runner.
import assert from 'node:assert/strict'

export const checkEnergyAreaNational = async ({
  browser,
  captureUrl,
  attach,
  move,
  snapshot,
  evidence,
  copy,
  locale,
  viewportName,
  scenario = 'normal',
  assertAutomaticControls,
  checkGestures,
}) => {
  const context = await browser.newContext({
    viewport:
      viewportName === 'mobile'
        ? { width: 390, height: 844 }
        : { width: 1440, height: 900 },
    hasTouch: viewportName === 'mobile',
  })
  const page = await context.newPage()
  const requests = [],
    responses = []
  page.on('pageerror', (e) =>
    evidence.pageErrors.push({
      scenario,
      locale,
      viewportName,
      message: e.message,
    })
  )
  page.on('request', (r) => {
    if (
      /energy-data\/areas|energymap_(postal_code|municipality|region)_areas/.test(
        r.url()
      )
    )
      requests.push(r.url())
  })
  page.on('response', async (r) => {
    if (
      r.url().includes('/energy-data/areas/') &&
      !r.url().endsWith('/metadata')
    ) {
      try {
        responses.push({
          url: r.url(),
          status: r.status(),
          body: await r.json(),
        })
      } catch {
        /* Failed requests are asserted in the panel. */
      }
    }
  })
  if (scenario === 'missing-origin') {
    // Browser-local missing configuration: leave the shared dev service/env intact.
    await context.route(
      (url) => url.pathname.endsWith('/energy/common/areas/config.ts'),
      async (route) => {
        const response = await route.fetch(),
          body = await response.text()
        assert.match(body, /origin = "https:\/\/energy-service-test.avoin.org"/)
        await route.fulfill({
          response,
          body: body.replace(
            'origin = "https://energy-service-test.avoin.org"',
            'origin = undefined'
          ),
        })
      }
    )
  }
  if (scenario === 'blocked-metadata' || scenario === 'failed-details')
    await context.route(
      (url) =>
        url.origin === 'https://energy-service-test.avoin.org' &&
        url.pathname.startsWith('/energy-data/areas/'),
      (route) => {
        const metadata = new URL(route.request().url()).pathname.endsWith(
          '/metadata'
        )
        return (scenario === 'blocked-metadata' ? metadata : !metadata)
          ? route.abort('failed')
          : route.continue()
      }
    )
  await page.goto(`${captureUrl.origin}/${locale}/energy`, {
    waitUntil: 'domcontentloaded',
  })
  await attach(page)
  const local = copy[locale],
    panel = page.getByTestId('energy-area-detail')
  const button = (name) =>
    page
      .getByRole('button', { name, exact: true })
      .filter({ visible: true })
      .first()
  if (viewportName === 'mobile')
    await page.locator('.sidebar-toggle-button').click()
  if (scenario === 'normal')
    await checkGestures({ page, viewportName, fixtureBacked: false })
  const physicalHit = async (level, code) => {
    await page.waitForFunction(
      ({ level, code }) =>
        window.__energyModesTest.map
          .queryRenderedFeatures()
          .some(
            (f) =>
              f.properties?.level === level && f.properties.area_code === code
          ),
      { level, code }
    )
    const point = await page.evaluate(
      ({ level, code }) => {
        const map = window.__energyModesTest.map,
          rect = map.getCanvas().getBoundingClientRect()
        // Hit-test visible interior pixels, avoiding the desktop sidebar and controls.
        for (let y = 150; y < rect.height - 140; y += 12)
          for (
            let x = Math.max(30, rect.width > 800 ? 410 : 30);
            x < rect.width - 70;
            x += 12
          ) {
            const hits = map
              .queryRenderedFeatures([x, y])
              .filter((f) => f.properties?.level === level)
            const hit = hits.find(
              (f) => f.layer.type === 'fill' && f.properties.area_code === code
            )
            if (hit && hits.every((f) => f.properties.area_code === code))
              return {
                x: rect.x + x,
                y: rect.y + y,
                id: hit.id,
                sourceLayer: hit.sourceLayer,
                properties: hit.properties,
              }
          }
        return null
      },
      { level, code }
    )
    assert(point, `Visible national hit ${level}:${code}`)
    assert.equal(point.id, `${level}:${code}`)
    assert.equal(point.sourceLayer, `energymap_${level}_areas`)
    assert(!Object.hasOwn(point.properties, 'release_id'))
    await page.mouse.move(point.x, point.y)
    await page.waitForTimeout(100)
    await page.mouse.click(point.x, point.y)
    await panel.waitFor({ state: 'visible' })
    await page.waitForFunction(
      (id) =>
        window.__energyModesTest.mapStore.getState().selectedFeatures[0]?.id ===
        id,
      point.id
    )
    const selected = await page.evaluate(() => {
      const { map, mapStore } = window.__energyModesTest,
        f = mapStore.getState().selectedFeatures[0]
      return map.getFeatureState({
        source: f.source,
        sourceLayer: f.sourceLayer,
        id: f.id,
      })
    })
    assert.equal(selected.selected, true)
    evidence.checks.push({
      unmocked: true,
      scenario,
      locale,
      viewportName,
      physicalHit: point,
      selected,
    })
  }
  const count = async ({ code, buildings, scope }) => {
    await page.waitForFunction(
      ({ buildings, locale }) => {
        const text = document.querySelector(
          '[data-testid="energy-area-detail"] dl dd'
        )?.textContent
        return (
          text?.includes(new Intl.NumberFormat(locale).format(buildings)) &&
          !document.querySelector('[aria-busy="true"]')
        )
      },
      { buildings, locale }
    )
    let latest
    for (let i = 0; i < 100; i++) {
      latest = responses
        .filter(
          (r) =>
            r.body.area_code === code &&
            r.body.scope?.municipality_code === scope
        )
        .at(-1)
      if (latest) break
      await page.waitForTimeout(50)
    }
    assert(latest, `Response for ${code}/${scope ?? 'global'}`)
    assert.equal(latest.body.latest, true)
    assert.equal(latest.body.building_count, buildings)
    assert(!Object.hasOwn(latest.body, 'release_id'))
    assert.equal(
      await panel.getByTestId('energy-area-detail-scope').count(),
      scope ? 1 : 0
    )
    assert.equal(
      await panel.evaluate((n) => n.scrollWidth > n.clientWidth + 1),
      false
    )
  }
  for (const zoom of [
    6.999, 7, 9.999, 10, 11.999, 12, 11.999, 10, 9.999, 7, 6.999,
  ]) {
    await move({ page, zoom, center: [24.94, 60.17] })
    const expected =
      zoom < 7
        ? 'region'
        : zoom < 10
          ? 'municipality'
          : zoom < 12
            ? 'postal_code'
            : 'buildings'
    await page.waitForFunction((level) => {
      const { map, appletStore } = window.__energyModesTest
      const levels = [
        ...new Set(
          map
            .queryRenderedFeatures()
            .filter((f) => f.source.startsWith('energymap_areas_'))
            .map((f) => f.properties.level)
        ),
      ]
      return (
        appletStore.getState().effectiveGeography === level &&
        (level === 'buildings'
          ? !levels.length
          : levels.length === 1 && levels[0] === level)
      )
    }, expected)
    await assertAutomaticControls(page, locale)
    evidence.checks.push({
      unmocked: true,
      scenario,
      locale,
      viewportName,
      zoom,
      expected,
    })
  }
  for (const [level, code, zoom, buildings] of [
    ['region', '01', 6, 480402],
    ['municipality', '091', 8, 52969],
    ['postal_code', '00100', 11, 624],
  ]) {
    await move({ page, zoom, center: [24.94, 60.17] })
    await physicalHit(level, code)
    if (scenario === 'missing-origin' || scenario === 'failed-details') {
      await panel.getByRole('alert').waitFor()
      assert.equal(await panel.locator('dl').count(), 0)
    } else await count({ code, buildings })
    await assertAutomaticControls(page, locale)
    await snapshot(
      page,
      `${locale}-${viewportName}-${scenario}-national-${level}`
    )
    await button(local.close).click()
    if (viewportName === 'mobile')
      await page.locator('.sidebar-toggle-button').click()
  }
  if (scenario === 'normal') {
    // Real building polygons remain selectable after the automatic area bands.
    await move({ page, zoom: 16, center: [24.94, 60.17] })
    await page.waitForFunction(() =>
      window.__energyModesTest.map
        .queryRenderedFeatures()
        .some((f) => f.source === 'energymap_building_polygons')
    )
    const buildingPoint = await page.evaluate(() => {
      const map = window.__energyModesTest.map,
        rect = map.getCanvas().getBoundingClientRect()
      for (let y = 180; y < rect.height - 130; y += 4)
        for (let x = rect.width > 800 ? 430 : 30; x < rect.width - 90; x += 4) {
          const f = map
            .queryRenderedFeatures([x, y])
            .find(
              (f) =>
                f.source === 'energymap_building_polygons' &&
                f.layer.type === 'fill'
            )
          if (f) return { x: rect.x + x, y: rect.y + y, id: f.id }
        }
      return null
    })
    assert(buildingPoint, 'Visible national building')
    await page.mouse.click(buildingPoint.x, buildingPoint.y)
    await page.getByTestId('building-info-tab-page-basic').waitFor()
    await snapshot(page, `${locale}-${viewportName}-national-building`)
    evidence.checks.push({
      unmocked: true,
      locale,
      viewportName,
      realBuildingClick: buildingPoint,
    })
    await move({ page, zoom: 8, center: [24.94, 60.17] })
    if (viewportName === 'mobile')
      await page.locator('.sidebar-toggle-button').click()
  }
  if (scenario === 'normal') {
    const related = (level, code) =>
      button(`${locale === 'fi' ? 'Avaa' : 'Open'} ${local[level]} ${code}`)
    const whole =
      locale === 'fi' ? 'Näytä koko postinumeroalue' : 'Show whole postal area'
    const back =
      locale === 'fi'
        ? 'Takaisin edelliselle aluetasolle'
        : 'Back to previous geography'
    await move({ page, zoom: 8, center: [24.94, 60.17] })
    await physicalHit('municipality', '091')
    await count({ code: '091', buildings: 52969 })
    await related('postal_code', '00370').click()
    await count({ code: '00370', buildings: 655, scope: '091' })
    assert.equal(await related('municipality', '049').count(), 1)
    assert.equal(await related('municipality', '091').count(), 1)
    await snapshot(page, `${locale}-${viewportName}-national-scoped-091`)
    // Refresh/reconnect deliberately request loaded tiles without dropping scope.
    const tilesBefore = requests.filter((u) => u.includes('@pbf/')).length
    const detailsBefore = requests.filter((u) =>
      u.includes('/postal_code/00370')
    ).length
    await button(local.refresh).click()
    await page.waitForFunction(
      () => !document.querySelector('[aria-busy="true"]')
    )
    await page.waitForTimeout(1200)
    await page.evaluate(() => window.dispatchEvent(new Event('online')))
    await page.waitForTimeout(1500)
    assert(requests.filter((u) => u.includes('@pbf/')).length > tilesBefore)
    assert(
      requests.filter((u) => u.includes('/postal_code/00370')).length >=
        detailsBefore + 2
    )
    await count({ code: '00370', buildings: 655, scope: '091' })
    await page.evaluate(() =>
      window.__energyModesTest.map.setStyle({
        version: 8,
        sources: {},
        layers: [
          {
            id: 'national-background',
            type: 'background',
            paint: { 'background-color': '#eef2f5' },
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
    await page.waitForTimeout(1000)
    assert.equal(
      await page.evaluate(() => {
        const { map, mapStore } = window.__energyModesTest,
          f = mapStore.getState().selectedFeatures[0]
        return (
          f &&
          map.getFeatureState({
            source: f.source,
            sourceLayer: f.sourceLayer,
            id: f.id,
          }).selected
        )
      }),
      true
    )
    await count({ code: '00370', buildings: 655, scope: '091' })
    await button(whole).click()
    await count({ code: '00370', buildings: 974 })
    await button(back).click()
    await count({ code: '00370', buildings: 655, scope: '091' })
    await related('municipality', '049').click()
    await related('postal_code', '00370').click()
    await count({ code: '00370', buildings: 319, scope: '049' })
    await snapshot(page, `${locale}-${viewportName}-national-scoped-049`)
    await button(whole).click()
    await count({ code: '00370', buildings: 974 })
    evidence.checks.push({
      unmocked: true,
      scenario,
      locale,
      viewportName,
      scopedCounts: [655, 319],
      global: 974,
      refresh: true,
      reconnect: true,
      styleSelected: true,
      back: true,
    })
  } else {
    await button(local.refresh).click()
    await page.waitForTimeout(300)
    await assertAutomaticControls(page, locale)
    assert.equal(
      await page.evaluate(
        () =>
          Object.keys(window.__energyModesTest.map.getStyle().sources).filter(
            (id) => id.startsWith('energymap_areas_')
          ).length
      ),
      3
    )
  }
  assert(requests.every((u) => !u.includes('release_id')))
  evidence.routes.push({
    locale,
    viewportName,
    scenario,
    unmocked: true,
    requests,
    details: responses.map((r) => ({
      url: r.url,
      status: r.status,
      code: r.body.area_code,
      count: r.body.building_count,
      scope: r.body.scope,
      asOf: r.body.as_of,
    })),
  })
  await context.close()
}
