import {
  ENERGYMAP_VENTILATION_CATEGORY_PROPERTY,
  ENERGYMAP_VENTILATION_CATEGORY_VALUES,
  isEnergymapVentilationCategory,
} from './ventilation'

describe('Energiakartta ventilation category contract', () => {
  it('exposes the published property and categories in UI order', () => {
    expect(ENERGYMAP_VENTILATION_CATEGORY_PROPERTY).toBe(
      'ventilation_category'
    )
    expect(ENERGYMAP_VENTILATION_CATEGORY_VALUES).toEqual([
      'mechanical',
      'gravity',
      'other',
      'no_info',
    ])
  })

  it.each(ENERGYMAP_VENTILATION_CATEGORY_VALUES)(
    'accepts the canonical %s category',
    (category) => {
      expect(isEnergymapVentilationCategory(category)).toBe(true)
    }
  )

  it.each([
    undefined,
    null,
    '',
    ' ',
    '1',
    'Painovoimainen ilmanvaihtojärjestelmä',
    'future_category',
    1,
  ])('rejects non-canonical value %p', (value) => {
    expect(isEnergymapVentilationCategory(value)).toBe(false)
  })
})
