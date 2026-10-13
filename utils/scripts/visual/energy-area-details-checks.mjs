// Postal-only navigation remains meaningful. Region/municipality relation lists
// were removed; select those polygons directly through the map instead.
import assert from 'node:assert/strict'
export const checkEnergyAreaDetails = async ({
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
}) => {
  await selectTheme(page, locale, 'energyCertificates')
  await move({ page, zoom: 11 })
  await clickArea({ page, level: 'postal_code' })
  const related = page.getByTestId('energy-area-relations')
  await related.waitFor()
  const code = await page.evaluate(
    () =>
      window.__energyModesTest.mapStore.getState().selectedFeatures[0]
        .properties.area_code
  )
  const whole =
    locale === 'fi' ? 'Näytä koko postinumeroalue' : 'Show whole postal area'
  const back =
    locale === 'fi'
      ? 'Takaisin edelliselle aluetasolle'
      : 'Back to previous geography'
  const buildings =
    locale === 'fi' ? 'Siirry rakennuksiin' : 'Explore buildings'
  const close = locale === 'fi' ? 'Sulje aluetiedot' : 'Close area details'
  // Postal municipality links still work and Back restores the full postal view.
  const first = related.getByRole('button').first()
  const municipality = (await first.textContent()).trim()
  await first.click()
  await page.waitForFunction(
    () =>
      window.__energyModesTest.appletStore.getState().effectiveGeography ===
      'municipality'
  )
  await page.getByTestId('energy-area-metrics').waitFor()
  assert.equal(await page.getByTestId('energy-area-relations').count(), 0)
  await page
    .getByRole('button', { name: back, exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await page.getByTestId('energy-area-relations').waitFor()
  // Internal scoped navigation is still a supported request, although no deleted
  // municipality→postal list is reintroduced just to expose it in this harness.
  await sidebar(page, false)
  await move({ page, zoom: 8 })
  await page.evaluate(
    async ({ municipality, code }) => {
      const module = await (
        await fetch('/src/applets/energy/components/EnergyAreaRuntime.tsx')
      ).text()
      const selectionUrl = module.match(
        /from "([^"\n]*\/areas\/selection\.ts[^"\n]*)"/
      )[1]
      const { createAreaSelection } = await import(selectionUrl)
      const { createAreaSourceDescriptors } =
        await import('/src/applets/energy/layers/areaSource.ts')
      const { map, mapStore } = window.__energyModesTest
      map.jumpTo({ zoom: 11 })
      const descriptor = createAreaSourceDescriptors().find(
        (item) => item.level === 'postal_code'
      )
      mapStore.getState().setSelectedFeatures([
        createAreaSelection({
          request: {
            level: 'postal_code',
            areaCode: code,
            municipalityCode: municipality,
          },
          descriptor,
        }),
      ])
    },
    { municipality, code }
  )
  await page.getByTestId('energy-area-detail-scope').waitFor()
  await page.getByTestId('energy-area-metrics').waitFor()
  assert.match(
    await page.getByTestId('energy-area-detail-scope').textContent(),
    new RegExp(municipality)
  )
  await snapshot(
    page,
    `${locale}-${viewportName}-postal-municipality-intersection`
  )
  await page.getByRole('button', { name: whole, exact: true }).click()
  await page
    .getByTestId('energy-area-detail-scope')
    .waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: buildings, exact: true }).click()
  await page.waitForFunction(
    () =>
      window.__energyModesTest.appletStore.getState().effectiveGeography ===
      'buildings'
  )
  await page
    .getByRole('button', { name: back, exact: true })
    .filter({ visible: true })
    .first()
    .click()
  await page.getByTestId('energy-area-relations').waitFor()
  await page.getByRole('button', { name: close, exact: true }).click()
  evidence.checks.push({
    postalRelationsBack: true,
    scopedPostalWhole: true,
    buildingsReturn: true,
    fixtureBacked: !!fixture,
  })
}
