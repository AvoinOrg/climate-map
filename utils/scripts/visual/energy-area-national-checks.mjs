// Compare actual unmocked rendered tile fields to the independent latest API.
import assert from 'node:assert/strict'
export const compareNationalArea = async (row, evidence) => {
  const { properties: props } = row
  const url = `https://energy-service-test.avoin.org/energy-data/areas/${props.level}/${props.area_code}`
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
  assert.equal(response.status, 200)
  const detail = await response.json()
  assert.equal(props.building_count, detail.building_count)
  for (const code of 'ABCDEFG')
    assert.equal(
      props[`energy_class_${code.toLowerCase()}_count`],
      detail.metrics.energy_class.counts[code] ?? 0
    )
  assert.equal(
    props.energy_class_unknown_count,
    detail.metrics.energy_class.unknown_building_count
  )
  for (const source of ['official', 'modeled'])
    assert.equal(
      props[`energy_class_${source}_count`],
      detail.metrics.energy_class_source.counts[source] ?? 0
    )
  let explicit = 0
  for (const [category, code] of Object.entries({
    geothermal: '09',
    district: '01',
    electricity: '04',
    solar: '10',
  })) {
    const count = detail.metrics.heating_energy_source.counts[code] ?? 0
    assert.equal(props[`heating_${category}_count`], count)
    explicit += count
  }
  assert.equal(props.heating_other_count, detail.building_count - explicit)
  for (const category of ['mechanical', 'gravity', 'other', 'no_info'])
    assert.equal(
      props[`ventilation_${category}_count`],
      detail.metrics.ventilation.counts[category] ?? 0
    )
  evidence.checks.push({
    nationalCountsMatch: true,
    id: row.id,
    url,
    checkedAt: new Date().toISOString(),
    buildingCount: detail.building_count,
    modeled: props.energy_class_modeled_count,
  })
}
