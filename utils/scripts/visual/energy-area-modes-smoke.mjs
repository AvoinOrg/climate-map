// Actual served Energy app, with bounded synthetic tiles or unmocked national
// data. The same shared theme/category controls drive all automatic zoom levels.
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium } from '@playwright/test'
import { installEnergyAreaFixtureRoutes } from '../../test/energyAreas/playwright.mjs'
import { installEnergyBuildingFixtureRoutes } from '../../test/energyAreas/buildings.mjs'
import { checkEnergyAreaDetails } from './energy-area-details-checks.mjs'
import { compareNationalArea } from './energy-area-national-checks.mjs'
const require = createRequire(import.meta.url)
const {
  createEnergyAreaFixture,
} = require('../../test/energyAreas/responder.cjs')
const {
  getChromiumLaunchOptions,
  maybeReexecInsideXvfb,
  assertWebGLAvailable,
} = require('./browserRuntime.js')
assert(process.argv.includes('--no-start'), 'Use the doctor-managed runtime')
const bootstrap = maybeReexecInsideXvfb({ browserMode: 'xvfb-webgl' })
if (bootstrap.reexecuted) process.exit(bootstrap.exitCode)
const arg = (name, fallback) =>
  process.argv
    .find((value) => value.startsWith(`--${name}=`))
    ?.slice(name.length + 3) ?? fallback
const origin = new URL(arg('base-url', 'http://localhost:6900'))
if (origin.hostname === '127.0.0.1') origin.hostname = 'localhost'
const national = process.argv.includes('--national')
const out = path.resolve(
  arg(
    'output',
    `.dev/visual-regression/F105-${national ? 'national' : 'fixture'}-${Date.now()}`
  )
)
await fs.mkdir(out, { recursive: true })
const evidence = {
  command: process.argv.join(' '),
  fixtureBacked: !national,
  checks: [],
  screenshots: [],
  pageErrors: [],
  consoleErrors: [],
}
const copy = {
  fi: {
    close: 'Sulje aluetiedot',
    themes: {
      energyCertificates: 'Näytä tai piilota energialuokat',
      heating: 'Näytä tai piilota lämmitys',
      ventilation: 'Näytä tai piilota ilmanvaihto',
    },
  },
  en: {
    close: 'Close area details',
    themes: {
      energyCertificates: 'Show or hide energy classes',
      heating: 'Show or hide heating',
      ventilation: 'Show or hide ventilation',
    },
  },
}
const translations = Object.fromEntries(
  await Promise.all(
    ['fi', 'en'].map(async (locale) => [
      locale,
      JSON.parse(
        await fs.readFile(`i18n/energiakartta/${locale}.json`, 'utf8')
      ),
    ])
  )
)
const translated = (locale, key) =>
  key
    .split('.')
    .reduce((value, segment) => value?.[segment], translations[locale])
for (const locale of ['fi', 'en'])
  for (const [mode, key] of Object.entries({
    energyCertificates: 'energy_classes',
    heating: 'heating',
    ventilation: 'ventilation',
  }))
    copy[locale].themes[mode] = translated(
      locale,
      `sidebar.front_page.aria.toggle_${key}`
    )
let palettes
let fields
const rgb = (hex) =>
  hex
    .slice(1)
    .match(/../g)
    .map((channel) => parseInt(channel, 16))
const assertRemoved = async (page) => {
  assert.equal(await page.getByTestId('energy-area-controls').count(), 0)
  assert.equal(
    await page
      .getByRole('combobox', {
        name: /Alueen väritys|Area shading|sidebar\.area_map\.metric/,
        includeHidden: true,
      })
      .count(),
    0
  )
  const text = await page.locator('body').textContent()
  assert.doesNotMatch(
    text,
    /Nykyinen aluetaso|Current geography|Päivitä aluetiedot|Refresh area data|Aluetiedot kattavat kaikki|Area summaries cover all|certificate_coverage|sidebar\.area_map\.(current_level|scope|legend|refresh)/
  )
  // The old card wrapper was solely a slot child; it must also be gone.
  assert.equal(
    await page
      .locator('details')
      .filter({
        hasText:
          /certificate coverage.*legend|energiatodistusten kattavuus.*selite/i,
      })
      .count(),
    0
  )
}
const snapshot = async (page, name) => {
  await assertRemoved(page)
  await page.screenshot({ path: path.join(out, `${name}.png`), fullPage: true })
  evidence.screenshots.push(name)
}
const attach = async (page) => {
  await page.evaluate(async () => {
    // Follow Vite's actual resolved dependency URL, including its HMR stamp.
    // Importing the bare path after edits can instantiate a second Zustand store.
    const module = await (
      await fetch('/src/applets/energy/components/EnergyAreaRuntime.tsx')
    ).text()
    const storeUrl = module.match(
      /from "([^"\n]*\/state\/appletStore\.ts[^"\n]*)"/
    )[1]
    const [{ useMapInstanceStore }, { useMapStore }, { useAppletStore }] =
      await Promise.all([
        import('/src/common/store/mapStore/mapInstanceStore.ts'),
        import('/src/common/store/mapStore/mapStore.ts'),
        import(storeUrl),
      ])
    window.__energyModesTest = {
      get map() {
        return useMapInstanceStore.getState()._map
      },
      mapStore: useMapStore,
      appletStore: useAppletStore,
    }
  })
  await page.waitForFunction(
    () =>
      window.__energyModesTest.map &&
      window.__energyModesTest.appletStore.getState().areaAvailable
  )
  const canonical = await page.evaluate(async () => {
    const [energy, heating, ventilation, thematic] = await Promise.all([
      import('/src/applets/energy/layers/energyCertificateLayerConf.ts'),
      import('/src/applets/energy/layers/heatingLayerConf.ts'),
      import('/src/applets/energy/layers/ventilationLayerConf.ts'),
      import('/src/applets/energy/common/areas/thematicStyle.ts'),
    ])
    return {
      palettes: {
        energyCertificates: energy.ENERGY_CERTIFICATE_CLASS_COLORS,
        heating: heating.HEATING_ENERGY_SOURCE_COLORS,
        ventilation: ventilation.VENTILATION_CATEGORY_COLORS,
      },
      fields: {
        heating: thematic.HEATING_FIELDS,
        ventilation: thematic.VENTILATION_FIELDS,
      },
    }
  })
  palettes = canonical.palettes
  fields = canonical.fields
}
const sidebar = async (page, open) => {
  const current = await page.evaluate(
    async () =>
      (await import('/src/common/store/uiStore.ts')).useUIStore.getState()
        .isSidebarOpen
  )
  if (current !== open) {
    await page
      .locator('.sidebar-toggle-button')
      .filter({ visible: true })
      .first()
      .click()
    await page.waitForTimeout(450)
  }
}
const selectTheme = async (page, locale, mode) => {
  await sidebar(page, true)
  const current = await page.evaluate(
    () => window.__energyModesTest.appletStore.getState().activeThematicMode
  )
  if (current !== mode)
    await page
      .getByRole('button', { name: copy[locale].themes[mode], exact: true })
      .click()
  await page.waitForFunction(
    (mode) =>
      window.__energyModesTest.appletStore.getState().activeThematicMode ===
      mode,
    mode
  )
}
const toggleCategory = async (page, locale, mode, category) => {
  await sidebar(page, true)
  const names = { districtHeating: 'district_heating' }
  if (mode === 'energyCertificates')
    await page
      .locator(`[data-energy-certificate-class="${category}"]`)
      .filter({ visible: true })
      .click()
  else
    await page
      .getByRole('switch', {
        name: translated(
          locale,
          `sidebar.front_page.${mode}.legend.${names[category] ?? category}`
        ),
        exact: true,
      })
      .click()
  await page.waitForTimeout(100)
}
const move = async ({ page, zoom, center = [24.94, 60.16] }) => {
  await page.evaluate(
    ({ zoom, center }) => window.__energyModesTest.map.jumpTo({ zoom, center }),
    { zoom, center }
  )
  await page.waitForTimeout(700)
}
const rendered = (page, level) =>
  page.evaluate((level) => {
    const { map, appletStore } = window.__energyModesTest
    const state = appletStore.getState()
    return map
      .queryRenderedFeatures()
      .filter(
        (feature) =>
          feature.source.startsWith('energymap_areas_') &&
          feature.layer.type === 'fill' &&
          feature.properties.level === level
      )
      .map((feature) => {
        const color = map.style._layers[feature.layer.id].paint
          .get('fill-color')
          .evaluate({ type: 3, properties: feature.properties }, {})
        return {
          id: feature.id,
          source: feature.source,
          properties: feature.properties,
          color: [color.r * 255, color.g * 255, color.b * 255],
          theme: state.activeThematicMode,
          classes: state.activeEnergyCertificateClasses,
          heating: state.heatingSwitchState,
          ventilation: state.ventilationSwitchState,
        }
      })
  }, level)
const verifyColors = async (page, level) => {
  await page.waitForFunction(
    (level) =>
      window.__energyModesTest.map
        .queryRenderedFeatures()
        .some(
          (feature) =>
            feature.source.startsWith('energymap_areas_') &&
            feature.properties.level === level
        ),
    level
  )
  const rows = await rendered(page, level)
  assert(rows.length)
  for (const row of rows) {
    const props = row.properties
    assert.equal(
      props.thematic_contract_version,
      1,
      `Delivered ${row.id} contract`
    )
    let expected
    if (row.theme === 'energyCertificates') {
      const counts = Object.keys(palettes.energyCertificates).map((key) => [
        key,
        props[`energy_class_${key.toLowerCase()}_count`],
      ])
      const denominator = counts.reduce((total, [, count]) => total + count, 0)
      assert.equal(
        denominator + props.energy_class_unknown_count,
        props.building_count
      )
      expected = denominator
        ? [0, 1, 2].map(
            (channel) =>
              counts.reduce(
                (total, [key, count]) =>
                  total +
                  count *
                    rgb(
                      row.classes.includes(key)
                        ? palettes.energyCertificates[key]
                        : '#BFBFBF'
                    )[channel],
                0
              ) / denominator
          )
        : rgb('#BFBFBF')
    } else {
      const choices = row[row.theme]
      const winner = Object.keys(fields[row.theme])
        .filter((key) => choices[key])
        .reduce(
          (best, key) =>
            props[fields[row.theme][key]] >
            (best ? props[fields[row.theme][best]] : 0)
              ? key
              : best,
          null
        )
      assert(
        winner,
        `Rendered categorical area has enabled population ${row.id}`
      )
      expected = rgb(palettes[row.theme][winner])
    }
    row.color.forEach((channel, index) =>
      assert(
        Math.abs(channel - expected[index]) < 0.001,
        `${row.id} ${row.theme}: ${row.color} vs ${expected}`
      )
    )
  }
  const unique = [...new Map(rows.map((row) => [row.id, row])).values()]
  evidence.checks.push({
    level,
    theme: rows[0].theme,
    visibleFeatures: rows.length,
    samples: unique.slice(0, 3),
  })
  if (national) await compareNationalArea(unique[0], evidence)
  return rows
}
const clickArea = async ({ page, level }) => {
  await sidebar(page, false)
  const point = await page.evaluate((level) => {
    const { map } = window.__energyModesTest
    const rect = map.getCanvas().getBoundingClientRect()
    const center = map.project(map.getCenter())
    const centralHit = map
      .queryRenderedFeatures(center)
      .find(
        (feature) =>
          feature.source.startsWith('energymap_areas_') &&
          feature.properties.level === level
      )
    if (centralHit)
      return { x: center.x + rect.x, y: center.y + rect.y, id: centralHit.id }
    for (let y = 150; y < Math.min(rect.height - 130, 650); y += 50)
      for (let x = 100; x < rect.width - 100; x += 50) {
        const hit = map
          .queryRenderedFeatures([x, y])
          .find(
            (feature) =>
              feature.source.startsWith('energymap_areas_') &&
              feature.properties.level === level
          )
        if (hit) return { x: x + rect.x, y: y + rect.y, id: hit.id }
      }
    throw new Error(`No visible clickable ${level} polygon`)
  }, level)
  await page.mouse.click(point.x, point.y)
  await page.getByTestId('energy-area-detail').waitFor({ state: 'visible' })
  await page.waitForFunction(
    (id) =>
      window.__energyModesTest.mapStore
        .getState()
        .selectedFeatures.some((feature) => feature.id === id),
    point.id
  )
  await page.getByTestId('energy-area-metrics').waitFor()
  if (level !== 'postal_code') {
    assert.equal(await page.getByTestId('energy-area-relations').count(), 0)
    assert.equal(await page.getByTestId('energy-area-scale-2013').count(), 0)
    assert.equal(await page.getByTestId('energy-area-scale-2018').count(), 0)
    assert.doesNotMatch(
      await page.getByTestId('energy-area-detail').textContent(),
      /Viralliset energialuokat|Official energy classes|Liittyvät|Related areas|Related postal/
    )
  }
  return point.id
}
const checkBuilding = async ({ page, locale, viewportName }) => {
  const result = await page.evaluate(() => {
    const { map, appletStore } = window.__energyModesTest
    const state = appletStore.getState()
    const theme = map.style._layers['energymap_energy_certificates-fill']
    const rows = map
      .queryRenderedFeatures()
      .filter(
        (feature) => feature.layer.id === 'energymap_energy_certificates-fill'
      )
    const colors = rows.slice(0, 10).map((feature) => {
      const color = theme.paint
        .get('fill-color')
        .evaluate({ type: 3, properties: feature.properties }, {})
      return {
        class: feature.properties.energy_class,
        modeled: feature.properties.is_energy_class_modeled,
        active: state.activeEnergyCertificateClasses.includes(
          feature.properties.energy_class
        ),
        color: [color.r * 255, color.g * 255, color.b * 255],
      }
    })
    let point
    const rect = map.getCanvas().getBoundingClientRect()
    for (const feature of rows) {
      if (feature.geometry.type !== 'Polygon') continue
      const ring = feature.geometry.coordinates[0].slice(0, -1)
      const center = ring.reduce(
        (sum, coordinate) => [
          sum[0] + coordinate[0] / ring.length,
          sum[1] + coordinate[1] / ring.length,
        ],
        [0, 0]
      )
      const projected = map.project(center)
      if (
        projected.x < 70 ||
        projected.x > rect.width - 100 ||
        projected.y < 90 ||
        projected.y > rect.height - 140
      )
        continue
      if (
        map
          .queryRenderedFeatures(projected)
          .some((hit) => hit.source === feature.source && hit.id === feature.id)
      ) {
        point = { x: projected.x + rect.x, y: projected.y + rect.y }
        break
      }
    }
    return { colors, point }
  })
  assert(result.colors.length, 'Actual building thematic fill is rendered')
  for (const row of result.colors) {
    const expected = rgb(
      row.active ? palettes.energyCertificates[row.class] : '#BFBFBF'
    )
    row.color.forEach((channel, index) =>
      assert(Math.abs(channel - expected[index]) < 0.001)
    )
  }
  assert(result.point, 'An actual building polygon is clickable')
  await page.mouse.click(result.point.x, result.point.y)
  await page
    .getByTestId('building-info-tab-page-basic')
    .waitFor({ state: 'visible' })
  await snapshot(page, `${locale}-${viewportName}-building-details`)
  await page
    .getByRole('button', {
      name: translated(locale, 'sidebar.building_info.aria.close'),
      exact: true,
    })
    .click()
  evidence.checks.push({
    actualBuildingClick: true,
    colors: result.colors,
    locale,
    viewportName,
  })
}
const browser = await chromium.launch(
  getChromiumLaunchOptions({ browserMode: 'xvfb-webgl' })
)
try {
  for (const locale of arg('locale', 'fi,en').split(','))
    for (const viewportName of arg('viewport', 'desktop,mobile').split(',')) {
      const context = await browser.newContext({
        viewport:
          viewportName === 'mobile'
            ? { width: 390, height: 844 }
            : { width: 1440, height: 900 },
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
        if (['error', 'warning'].includes(message.type()))
          evidence.consoleErrors.push({
            locale,
            viewportName,
            message: message.text(),
          })
      })
      const fixture = national ? null : createEnergyAreaFixture()
      if (fixture) {
        await installEnergyAreaFixtureRoutes({ target: context, fixture })
        await installEnergyBuildingFixtureRoutes({ target: context })
      }
      await page.goto(`${origin.origin}/${locale}/energy`, {
        waitUntil: 'domcontentloaded',
      })
      await assertWebGLAvailable({ browser, browserMode: 'xvfb-webgl' })
      await attach(page)
      await move({ page, zoom: 6 })
      assert.equal((await rendered(page, 'region')).length, 0)
      await snapshot(page, `${locale}-${viewportName}-frontpage-no-theme`)
      if (!process.argv.includes('--details-only'))
        for (const [level, zoom] of [
          ['region', 6],
          ['municipality', 8],
          ['postal_code', 11],
        ]) {
          await move({ page, zoom })
          for (const mode of ['energyCertificates', 'heating', 'ventilation']) {
            await selectTheme(page, locale, mode)
            await sidebar(page, false)
            const original = await verifyColors(page, level)
            await snapshot(page, `${locale}-${viewportName}-${level}-${mode}`)
            const keys = Object.keys(palettes[mode])
            const count = (key) =>
              original[0].properties[
                mode === 'energyCertificates'
                  ? `energy_class_${key.toLowerCase()}_count`
                  : fields[mode][key]
              ]
            const category = keys.reduce(
              (best, key) => (count(key) > count(best) ? key : best),
              keys[0]
            )
            await toggleCategory(page, locale, mode, category)
            await sidebar(page, false)
            await verifyColors(page, level)
            await toggleCategory(page, locale, mode, category)
            // All off uses gray for classes; categorical areas disappear.
            for (const category of Object.keys(palettes[mode]))
              await toggleCategory(page, locale, mode, category)
            await sidebar(page, false)
            if (mode === 'energyCertificates') {
              const off = await verifyColors(page, level)
              off.forEach((row) =>
                assert(
                  row.color.every((value) => Math.abs(value - 191) < 0.001)
                )
              )
            } else assert.equal((await rendered(page, level)).length, 0)
            for (const category of Object.keys(palettes[mode]))
              await toggleCategory(page, locale, mode, category)
            await sidebar(page, false)
            const restored = await verifyColors(page, level)
            const same = restored.find((row) => row.id === original[0].id)
            assert(same)
            assert.deepEqual(same.color, original[0].color)
          }
          await selectTheme(page, locale, 'energyCertificates')
          await clickArea({ page, level })
          await snapshot(page, `${locale}-${viewportName}-${level}-details`)
          await page
            .getByRole('button', { name: copy[locale].close, exact: true })
            .click()
        }
      if (fixture && !process.argv.includes('--details-only')) {
        // Genuine failed tile transport keeps its specific retry in the useful
        // sidebar. No generic availability card or refresh control is added.
        await selectTheme(page, locale, 'energyCertificates')
        await move({ page, zoom: 11 })
        fixture.enqueue({
          match: (url) => url.pathname.includes('energymap_postal_code_areas'),
          response: {
            status: 404,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: Buffer.from(''),
          },
        })
        await sidebar(page, true)
        await page.evaluate(() =>
          window.__energyModesTest.map.refreshTiles(
            'energymap_areas_postal_code'
          )
        )
        const retry = page.getByRole('button', {
          name: translated(locale, 'sidebar.area_map.retry_tiles'),
          exact: true,
        })
        await retry.waitFor({ state: 'visible' })
        await snapshot(page, `${locale}-${viewportName}-specific-tile-retry`)
        await retry.click()
        await retry.waitFor({ state: 'hidden' })
        evidence.checks.push({ specificTileRetry: true, locale, viewportName })
      }
      if (
        process.argv.includes('--details') ||
        process.argv.includes('--details-only')
      )
        await checkEnergyAreaDetails({
          page,
          locale,
          viewportName,
          move,
          selectTheme,
          sidebar,
          clickArea,
          snapshot,
          evidence,
          fixture,
        })
      await selectTheme(page, locale, 'energyCertificates')
      await toggleCategory(page, locale, 'energyCertificates', 'G')
      await move({ page, zoom: 15 })
      await sidebar(page, false)
      await page.waitForFunction(() =>
        window.__energyModesTest.map
          .queryRenderedFeatures()
          .some((feature) => feature.source === 'energymap_building_polygons')
      )
      await checkBuilding({ page, locale, viewportName })
      const buildingState = await page.evaluate(() => ({
        classes:
          window.__energyModesTest.appletStore.getState()
            .activeEnergyCertificateClasses,
        theme:
          window.__energyModesTest.appletStore.getState().activeThematicMode,
      }))
      assert(!buildingState.classes.includes('G'))
      await snapshot(page, `${locale}-${viewportName}-buildings-shared-classes`)
      await move({ page, zoom: 8 })
      await clickArea({ page, level: 'municipality' })
      const selectedId = await page.evaluate(
        () =>
          window.__energyModesTest.mapStore.getState().selectedFeatures[0].id
      )
      const before = await verifyColors(page, 'municipality')
      await page.evaluate(() => {
        const { map } = window.__energyModesTest
        map.setStyle(map.getStyle(), { diff: false })
        window.dispatchEvent(new Event('online'))
      })
      await page.waitForTimeout(1500)
      const after = await verifyColors(page, 'municipality')
      assert.deepEqual(
        after.find((row) => row.id === before[0].id)?.color,
        before[0].color
      )
      const selected = await page.evaluate(() => {
        const { map, mapStore } = window.__energyModesTest
        const feature = mapStore.getState().selectedFeatures[0]
        return {
          id: feature?.id,
          state:
            feature &&
            map.getFeatureState({
              source: feature.source,
              sourceLayer: feature.sourceLayer,
              id: feature.id,
            }),
        }
      })
      assert.equal(selected.id, selectedId)
      assert.equal(selected.state.selected, true)
      await snapshot(
        page,
        `${locale}-${viewportName}-style-reconnect-partial-categories`
      )
      await page
        .getByRole('button', { name: copy[locale].close, exact: true })
        .click()
      // Optional API failure is browser-scoped; tile coverage stays independent.
      await context.route('**/energy-data/areas/**', (route) => route.abort())
      await move({ page, zoom: 6 })
      await page.evaluate(() => window.dispatchEvent(new Event('online')))
      await verifyColors(page, 'region')
      evidence.checks.push({
        locale,
        viewportName,
        automaticLevels: true,
        allThemesCategories: true,
        details: true,
        buildingParity: true,
        styleReconnect: true,
        detailApiIndependent: true,
        fixtureBacked: !national,
      })
      await context.close()
    }
  assert.deepEqual(evidence.pageErrors, [])
} catch (error) {
  evidence.failure = error.stack
  const page = browser
    .contexts()
    .flatMap((context) => context.pages())
    .at(-1)
  if (page) {
    evidence.failureState = await page.evaluate(() => ({
      modules: performance
        .getEntriesByType('resource')
        .map((entry) => entry.name)
        .filter((url) =>
          /appletStore|EnergyAreaRuntime|mapInstanceStore/.test(url)
        ),
      map: !!window.__energyModesTest?.map,
      sources: window.__energyModesTest?.map?.getStyle()?.sources,
      context: window.__energyModesTest?.mapStore.getState().mapContext,
      state: window.__energyModesTest?.appletStore.getState(),
    }))
    await page.screenshot({
      path: path.join(out, 'failure.png'),
      fullPage: true,
    })
  }
  throw error
} finally {
  await fs.writeFile(
    path.join(out, 'evidence.json'),
    JSON.stringify(evidence, null, 2)
  )
  await browser.close()
}
console.log(
  JSON.stringify({
    output: out,
    checks: evidence.checks.length,
    screenshots: evidence.screenshots.length,
    fixtureBacked: !national,
  })
)
