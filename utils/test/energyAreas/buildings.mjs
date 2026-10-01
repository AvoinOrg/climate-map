// Isolated browser regression only, using the existing building MVT contract.
// Synthetic geometry/data; never imported by application code.
import geojsonVt from 'geojson-vt'
import { fromGeojsonVt } from '@maplibre/vt-pbf'
const buildingKey = '44444444-4444-4444-8444-444444444444'
const properties = {
  building_key: buildingKey,
  permanent_building_identifier: '101614422K',
  address_fin: 'Fixture building',
  postal_code: '00100',
  postal_office_fin: 'HELSINKI',
  main_purpose: '05',
  completion_date: '1967-01-01',
  heating_method: '01',
  heating_energy_source: '01',
  floor_area: 454,
  gross_floor_area: 500,
  total_area: 470,
  number_of_storeys: 2,
  energy_class: 'D',
  is_energy_class_modeled: false,
  energy_certificate_valid_until: '2031-12-31',
  energy_certificate_heated_net_area: 400,
  ventilation_category: 'gravity',
  energy_certificate_ventilation_type_label_fi: 'Painovoimainen ilmanvaihto',
  energy_certificate_ventilation_description_fi: 'Painovoimainen ilmanvaihto.',
  energy_certificate_recommendations_fi: 'Tiivistä yläpohjan lämmöneristystä.',
  distr_default_total: 367.7884615,
  distr_default_heat: 343.6634615,
  distr_default_elec: 24.125,
  distr_aahp_total: 289.7019231,
  distr_solar_total: 334.2980769,
  distr_windows_total: 332.6442308,
  energy_certificate_consumption: JSON.stringify({
    schema_version: 1,
    basis: 'standardized_calculation',
    building_identifier: '101614422K',
    certificate_id: 'fixture-certificate',
    certificate_version: 2018,
    completeness: 'complete',
    components: [
      { annual_kwh: 12000, carrier: 'district_heat' },
      { annual_kwh: 4000, carrier: 'electricity' },
    ],
    heated_net_area_m2: 400,
    signed_at: '2023-04-13',
    total_kwh_year: 16000,
    unit: 'kWh/year',
    valid_until: '2031-12-31',
  }),
}
const index = geojsonVt(
  {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        id: 1,
        properties,
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [24.9396, 60.1598],
              [24.9404, 60.1598],
              [24.9404, 60.1602],
              [24.9396, 60.1602],
              [24.9396, 60.1598],
            ],
          ],
        },
      },
    ],
  },
  { maxZoom: 17, extent: 4096, buffer: 64, tolerance: 0 }
)
export const installEnergyBuildingFixtureRoutes = async ({ target }) => {
  const requests = []
  await target.route(
    /\/gwc\/service\/tms\/1\.0\.0\/.*energymap_building_polygons.*\.pbf/,
    async (route) => {
      const url = new URL(route.request().url())
      const match = url.pathname.match(/\/(\d+)\/(\d+)\/(\d+)\.pbf$/)
      if (!match) return route.continue()
      requests.push(url.href)
      const [, z, x, row] = match.map(Number)
      const tile = index.getTile(z, x, 2 ** z - 1 - row)
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.mapbox-vector-tile',
        body: Buffer.from(
          tile ? fromGeojsonVt({ energymap_building_polygons: tile }) : []
        ),
      })
    }
  )
  return { requests, buildingKey }
}
