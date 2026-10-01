// Extends the existing actual-map harness and canonical API/MVT fixtures.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
const { createFixtureGate } = createRequire(import.meta.url)(
  '../../test/energyAreas/responder.cjs'
)

export const checkEnergyAreaDetails = async ({
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
}) => {
  const local = copy[locale]
  const panel = page.getByTestId('energy-area-detail')
  const backName =
    locale === 'fi'
      ? 'Takaisin edelliselle aluetasolle'
      : 'Back to previous geography'
  const wholeName =
    locale === 'fi' ? 'Näytä koko postinumeroalue' : 'Show whole postal area'
  const buildingsName =
    locale === 'fi' ? 'Siirry rakennuksiin' : 'Explore buildings'
  const relatedName = (level, code) =>
    `${locale === 'fi' ? 'Avaa' : 'Open'} ${local[level]} ${code}`
  const button = (name) =>
    page
      .getByRole('button', { name, exact: true })
      .filter({ visible: true })
      .first()
  const related = async (level, code) => {
    await button(relatedName(level, code)).click()
    await page.getByTestId('energy-area-relations').waitFor()
  }
  const identity = () =>
    page.evaluate(() =>
      window.__energyModesTest.mapStore
        .getState()
        .selectedFeatures.map((f) => f.id)
    )
  const expectDetail = async ({ code, count, scoped = false }) => {
    await panel.getByRole('heading', { level: 1 }).waitFor()
    await panel.getByText('2026', { exact: true }).waitFor()
    assert.match(await panel.innerText(), new RegExp(code))
    // Restrict to the summary definition list, rather than matching category counts.
    const text = await panel.locator('dl').first().innerText()
    assert.match(text, new RegExp(`${count} (?:rakennus|building)`))
    assert.equal(
      await page.getByTestId('energy-area-detail-scope').count(),
      scoped ? 1 : 0
    )
    assert.deepEqual(await identity(), [`postal_code:${code}`])
    assert(
      !(await panel.innerText()).match(
        /sidebar\.|unknown_scale|no_info|0110|11111111/
      )
    )
  }
  const postalPaint = () =>
    page.evaluate(() => {
      const { map } = window.__energyModesTest
      const layer = map
        .getStyle()
        .layers.find(
          (l) =>
            l.id.startsWith('energymap_areas_') &&
            l.id.endsWith('postal_code-fill')
        )
      return { color: layer.paint['fill-color'], filter: layer.filter ?? null }
    })
  const revealMobileMap = async () => {
    if (
      viewportName === 'mobile' &&
      (await page.evaluate(async () => {
        const { useUIStore } = await import('/src/common/store/uiStore.ts')
        return useUIStore.getState().isSidebarOpen
      }))
    ) {
      await page.locator('.sidebar-toggle-button').click()
      await page.waitForTimeout(500)
    }
  }
  await choose({ page, label: local.geography, value: local.region })
  await revealMobileMap()
  await move({ page, zoom: 6 })
  await clickArea({ page, level: 'region', code: '01' })
  await panel.getByText('2026', { exact: true }).waitFor()
  const initialDetails = fixture.requests.filter((url) =>
    /\/areas\/(region|municipality|postal_code)\/\d+\?/.test(url)
  ).length
  await related('municipality', '091')
  await panel.getByText('2026', { exact: true }).waitFor()
  assert.equal((await identity())[0], 'municipality:091')
  assert(
    fixture.requests.filter((url) =>
      /\/areas\/(region|municipality|postal_code)\/\d+\?/.test(url)
    ).length <=
      initialDetails + 1,
    'Related navigation fetches only selected detail (or uses pinned cache)'
  )
  assert.match(
    await panel.innerText(),
    locale === 'fi' ? /Maakunta 01/ : /Region 01/
  )
  await button(relatedName('region', '01')).click()
  await panel.getByText('2026', { exact: true }).waitFor()
  assert.equal((await identity())[0], 'region:01')
  await button(backName).click()
  await panel.getByText('2026', { exact: true }).waitFor()
  assert.equal((await identity())[0], 'municipality:091')
  await related('postal_code', '00100')
  await expectDetail({ code: '00100', count: 2, scoped: true })
  await page.waitForTimeout(600)
  const scopedPaint = await postalPaint()
  const crossing = await page.evaluate(() => {
    const { map } = window.__energyModesTest
    const features = map
      .queryRenderedFeatures()
      .filter((f) => f.properties?.area_id === 'postal_code:00100')
    const state = features.map((f) => ({
      count: f.properties.building_count,
      selected: map.getFeatureState({
        source: f.source,
        sourceLayer: f.sourceLayer,
        id: f.id,
      }).selected,
    }))
    const left = map
      .queryRenderedFeatures(map.project([24.92, 60.16]))
      .some((f) => f.properties?.area_id === 'postal_code:00100')
    const right = map
      .queryRenderedFeatures(map.project([24.96, 60.16]))
      .some((f) => f.properties?.area_id === 'postal_code:00100')
    return { state, left, right }
  })
  assert(
    crossing.state.length > 0 &&
      crossing.state.every((f) => f.count === 5 && f.selected === true)
  )
  assert(
    crossing.left && crossing.right,
    'Full postal geometry crosses municipality meridian 24.94'
  )
  assert.match(
    await page.getByTestId('energy-area-relations').innerText(),
    /005/
  )
  assert.match(
    await page.getByTestId('energy-area-relations').innerText(),
    /091/
  )
  await snapshot(page, `${locale}-${viewportName}-navigation-scoped-postal`)
  // Keyboard activation and focus transition use the real button and panel.
  await button(wholeName).focus()
  await page.keyboard.press('Enter')
  await expectDetail({ code: '00100', count: 5 })
  assert.deepEqual(await postalPaint(), scopedPaint)
  assert.equal(
    await panel
      .getByRole('heading', { level: 1 })
      .evaluate((node) => node === document.activeElement),
    true
  )
  for (const [metric, amount] of [
    ['floor_area', 408],
    ['gross_floor_area', 457],
    ['total_area', 546],
    ['energy_certificate_heated_net_area', 276],
  ]) {
    assert.match(
      await page.getByTestId(`energy-area-metric-${metric}`).innerText(),
      new RegExp(`${amount}\\s*m²`)
    )
  }
  for (const scale of ['2013', '2018']) {
    assert.match(
      await page.getByTestId(`energy-area-scale-${scale}`).innerText(),
      new RegExp(
        scale === '2013'
          ? '1 (?:voimassa oleva|valid class)'
          : '2 (?:voimassa olevaa|valid classes)'
      )
    )
    await page
      .getByTestId(`energy-area-scale-${scale}`)
      .scrollIntoViewIfNeeded()
    await snapshot(page, `${locale}-${viewportName}-official-scale-${scale}`)
  }
  for (const metric of [
    'heating_method',
    'heating_energy_source',
    'ventilation',
    'main_purpose',
    'construction_period',
  ]) {
    await page
      .getByTestId(`energy-area-metric-${metric}`)
      .scrollIntoViewIfNeeded()
    await snapshot(page, `${locale}-${viewportName}-summary-${metric}`)
  }
  await page
    .getByTestId('energy-area-metric-energy_certificate_heated_net_area')
    .scrollIntoViewIfNeeded()
  await snapshot(page, `${locale}-${viewportName}-four-area-sums`)
  assert.equal(
    await panel.evaluate((node) => node.scrollWidth > node.clientWidth + 1),
    false
  )
  await related('municipality', '005')
  assert.equal((await identity())[0], 'municipality:005')
  await button(backName).click()
  await expectDetail({ code: '00100', count: 5 })
  await button(backName).click()
  await expectDetail({ code: '00100', count: 2, scoped: true })
  // Compact scope explanation stays visible with the legend closed/fullscreen.
  await page.locator('.sidebar-toggle-button').click()
  await page.waitForTimeout(600)
  await page
    .getByTestId('energy-area-polygon-scope')
    .filter({ visible: true })
    .first()
    .waitFor()
  await snapshot(page, `${locale}-${viewportName}-scoped-floating-legend`)
  await page.locator('.sidebar-toggle-button').click()
  await page.waitForTimeout(600)
  await button(buildingsName).click()
  await panel.waitFor({ state: 'detached' })
  await revealMobileMap()
  await move({ page, zoom: 16 })
  await page.waitForFunction(
    (key) =>
      window.__energyModesTest.map
        .queryRenderedFeatures()
        .some((f) => f.properties?.building_key === key),
    buildingFixture.buildingKey
  )
  const point = await page.evaluate(() => {
    const map = window.__energyModesTest.map
    const point = map.project([24.94, 60.16])
    const rect = map.getCanvas().getBoundingClientRect()
    return { x: point.x + rect.x, y: point.y + rect.y }
  })
  await page.mouse.click(point.x, point.y)
  await page.getByTestId('building-info-tab-page-basic').waitFor()
  assert.equal(await panel.count(), 0)
  const building = await page.evaluate(
    () =>
      window.__energyModesTest.appletStore.getState().selectedBuilding
        ?.buildingKey
  )
  assert.equal(building, buildingFixture.buildingKey)
  assert.match(
    await page.getByTestId('building-info-panel-buildingDetails').innerText(),
    /Fixture building/
  )
  await button(locale === 'fi' ? 'Vesi' : 'Water').click()
  const water = page.getByTestId('building-info-water-resident-control')
  await water.waitFor()
  await water.getByRole('switch').click()
  const resident = water.getByRole('textbox')
  await resident.click()
  await resident.press('ControlOrMeta+A')
  await resident.press('Backspace')
  await resident.pressSequentially('3')
  assert.equal(await resident.inputValue(), '3')
  await resident.press('Tab')
  // Raw numeric inputs are verified with actual keyboard replacement/commit.
  assert.match(
    await page
      .getByTestId('building-info-primary-metric-value')
      .filter({ visible: true })
      .first()
      .innerText(),
    /131[,.]4/
  )
  await snapshot(page, `${locale}-${viewportName}-returned-building-water-edit`)
  await button(backName).waitFor()
  await button(
    locale === 'fi'
      ? 'Pienennä rakennustiedot'
      : 'Collapse building information'
  ).click()
  await page
    .getByTestId('building-info-tab-page-basic')
    .waitFor({ state: 'detached' })
  await button(backName).waitFor()
  await snapshot(page, `${locale}-${viewportName}-collapsed-building-back`)
  await button(backName).click()
  await expectDetail({ code: '00100', count: 2, scoped: true })
  assert.equal(
    await page.getByTestId('building-info-water-resident-control').count(),
    0
  )
  await button(backName).click()
  await panel.getByText('2026', { exact: true }).waitFor()
  assert.equal((await identity())[0], 'municipality:091')
  await button(backName).click()
  await panel.getByText('2026', { exact: true }).waitFor()
  assert.equal((await identity())[0], 'region:01')
  // Test-only setup of a truthful zero-intersection request through the same
  // production selection seam. No false relation is added to the crosswalk.
  await page.evaluate(async () => {
    const { createAreaSelection } =
      await import('/src/applets/energy/common/areas/selection.ts')
    const { createAreaSourceDescriptors } =
      await import('/src/applets/energy/layers/areaSource.ts')
    const { parseAreaMetadata } =
      await import('/src/applets/energy/common/areas/contract.ts')
    const metadata = parseAreaMetadata(
      await (
        await fetch(
          'https://energy-areas.fixture.test/energy-data/areas/metadata'
        )
      ).json()
    )
    const descriptors = createAreaSourceDescriptors({
      config: {
        ok: true,
        config: { origin: 'https://energy-areas.fixture.test' },
      },
      metadata,
    })
    window.__energyModesTest.appletStore
      .getState()
      .setGeographyMode('postal_code')
    window.__energyModesTest.map.jumpTo({ zoom: 11 })
    const descriptor = descriptors.find((d) => d.level === 'postal_code')
    window.__energyModesTest.mapStore.getState().setSelectedFeatures([
      createAreaSelection({
        descriptor,
        request: {
          releaseId: metadata.release_id,
          level: 'postal_code',
          areaCode: '00100',
          municipalityCode: '009',
        },
      }),
    ])
  })
  await expectDetail({ code: '00100', count: 0, scoped: true })
  assert.match(
    await panel.innerText(),
    locale === 'fi'
      ? /leikkauksessa ei ole rakennuksia/
      : /no buildings in the selected municipality/
  )
  assert.equal(
    await page
      .getByTestId('energy-area-relations')
      .getByRole('button', { name: relatedName('municipality', '009') })
      .count(),
    0
  )
  await snapshot(page, `${locale}-${viewportName}-zero-intersection`)
  await button(wholeName).click()
  await expectDetail({ code: '00100', count: 5 })
  await button(local.close).click()
  // Promote while a real scoped trail exists, then exercise a noncooperative
  // scoped response against a whole-area action in the new release.
  await choose({ page, label: local.geography, value: local.region })
  await revealMobileMap()
  await move({ page, zoom: 6 })
  await clickArea({ page, level: 'region', code: '01' })
  await related('municipality', '091')
  await related('postal_code', '00100')
  await expectDetail({ code: '00100', count: 2, scoped: true })
  const nextRelease = '22222222-2222-4222-8222-222222222222'
  fixture.setActiveRelease(nextRelease)
  await button(local.refresh).click()
  await page.waitForFunction(
    (release) =>
        Object.keys(window.__energyModesTest.map.getStyle().sources).some(
        (id) => id.includes(release)
      ),
    nextRelease
  )
  await panel.waitFor({ state: 'detached' })
  assert.deepEqual(await identity(), [])
  assert.equal(await button(backName).count(), 0)
  await snapshot(page, `${locale}-${viewportName}-obsolete-back-cleared`)
  fixture.enqueue({
    match: (url) =>
      url.pathname.endsWith('/region/01') &&
      url.searchParams.get('release_id') === nextRelease,
    transform: (payload) => ({
      ...payload,
      names: {
        fi: 'Synteettinen maakunta, jonka tarkoituksella pitkä lähdeaineiston nimi rivittyy pienellä näytöllä',
        en: 'Synthetic region with a deliberately long source name that wraps on a small screen',
        sv: null,
      },
    }),
  })
  await choose({ page, label: local.geography, value: local.region })
  await revealMobileMap()
  await move({ page, zoom: 6 })
  await clickArea({ page, level: 'region', code: '01' })
  await panel
    .getByRole('heading', { level: 1 })
    .getByText(locale === 'fi' ? /Synteettinen maakunta/ : /Synthetic region/)
    .waitFor()
  assert.equal(
    await panel.evaluate((node) => node.scrollWidth > node.clientWidth + 1),
    false
  )
  await snapshot(page, `${locale}-${viewportName}-long-source-name`)
  await related('municipality', '091')
  const gate = createFixtureGate()
  fixture.enqueue({
    match: (url) =>
      url.pathname.endsWith('/postal_code/00100') &&
      url.searchParams.get('municipality_code') === '091',
    gate: gate.promise,
    ignoreAbort: true,
  })
  await button(relatedName('postal_code', '00100')).click()
  await page.waitForFunction(() => document.querySelector('[aria-busy="true"]'))
  await button(wholeName).click()
  await expectDetail({ code: '00100', count: 4 })
  gate.release()
  await page.waitForTimeout(300)
  await expectDetail({ code: '00100', count: 4 })
  await button(backName).click()
  await expectDetail({ code: '00100', count: 2, scoped: true })
  await snapshot(page, `${locale}-${viewportName}-gated-scope-back`)
  await button(local.close).click()
  evidence.checks.push({
    locale,
    viewportName,
    fixtureBacked: true,
    detailNavigation: true,
    keyboardAndFocus: true,
    fullPolygonScopedStatistics: crossing,
    fullRelatedCrosswalk: ['005', '091'],
    unchangedScopedPaint: scopedPaint,
    fourSums: [408, 457, 546, 276],
    buildingFixtureBacked: true,
    buildingClickAndWaterEdit: true,
    backReachableExpandedAndCollapsed: true,
    regionCodeAndCrosswalkActions: true,
    staleScopedResponseIgnored: true,
    obsoleteReleaseBackCleared: true,
    longSourceNameWraps: true,
    zeroIntersectionSetup:
      'createAreaSelection identity placeholder, municipality 009; no invented relation',
    requestLog: fixture.requests.filter(
      (url) => !url.includes('/tiles/') && !url.includes('/gwc/')
    ),
  })
}
