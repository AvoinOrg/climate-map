import { parseEnergyCertificateConsumption } from './energyCertificateConsumption'

const BUILDING_IDENTIFIER = '103000000A'

const STANDARD_COMPONENTS = [
  { carrier: 'electricity', annual_kwh: 1 },
  { carrier: 'district_heat', annual_kwh: 2 },
  { carrier: 'district_cooling', annual_kwh: 3 },
  { carrier: 'fossil_fuel', annual_kwh: 4 },
  { carrier: 'renewable_fuel', annual_kwh: 5 },
]

const createCompletePayload = (overrides: Record<string, unknown> = {}) => ({
  schema_version: 1,
  basis: 'standardized_calculation',
  unit: 'kWh/year',
  building_identifier: BUILDING_IDENTIFIER,
  certificate_id: 'certificate-123',
  certificate_version: 2018,
  signed_at: '2024-02-29T12:34:56.123456',
  valid_until: '2034-03-01T00:00:00',
  heated_net_area_m2: 123.45,
  components: STANDARD_COMPONENTS.map((component) => ({ ...component })),
  completeness: 'complete',
  total_kwh_year: 15,
  ...overrides,
})

const parseRaw = (
  rawConsumption: unknown,
  selectedBuildingIdentifier: unknown = BUILDING_IDENTIFIER
) =>
  parseEnergyCertificateConsumption({
    permanent_building_identifier: selectedBuildingIdentifier,
    energy_certificate_consumption: rawConsumption,
  })

const parsePayload = (
  payload: Record<string, unknown>,
  selectedBuildingIdentifier: unknown = BUILDING_IDENTIFIER
) => parseRaw(JSON.stringify(payload), selectedBuildingIdentifier)

const expectRejected = (properties: Record<string, unknown>) => {
  expect(() => parseEnergyCertificateConsumption(properties)).not.toThrow()
  expect(parseEnergyCertificateConsumption(properties)).toBeNull()
}

describe('parseEnergyCertificateConsumption envelope and schema', () => {
  it.each([
    ['missing', {}],
    ['undefined', { energy_certificate_consumption: undefined }],
    ['null', { energy_certificate_consumption: null }],
  ])('treats a %s old-tile property as normal absence', (_label, values) => {
    expectRejected({
      permanent_building_identifier: BUILDING_IDENTIFIER,
      ...values,
    })
  })

  it.each([
    ['empty JSON', ''],
    ['whitespace JSON', '   '],
    ['malformed JSON', '{"schema_version":1'],
    ['parsed null', 'null'],
    ['parsed array', '[]'],
    ['parsed string', '"payload"'],
    ['parsed number', '1'],
    ['parsed boolean', 'true'],
  ])('rejects %s without throwing', (_label, rawConsumption) => {
    expectRejected({
      permanent_building_identifier: BUILDING_IDENTIFIER,
      energy_certificate_consumption: rawConsumption,
    })
  })

  it.each([createCompletePayload(), 1, true, [], null])(
    'rejects a non-string tile property %#',
    (rawConsumption) => {
      expectRejected({
        permanent_building_identifier: BUILDING_IDENTIFIER,
        energy_certificate_consumption: rawConsumption,
      })
    }
  )

  it.each([
    ['missing schema', { schema_version: undefined }],
    ['future schema', { schema_version: 2 }],
    ['string schema', { schema_version: '1' }],
    ['fractional schema', { schema_version: 1.5 }],
    ['missing basis', { basis: undefined }],
    ['wrong basis', { basis: 'measured_consumption' }],
    ['missing unit', { unit: undefined }],
    ['wrong unit', { unit: 'MWh/year' }],
    ['missing certificate version', { certificate_version: undefined }],
    ['unsupported certificate version', { certificate_version: 2020 }],
    ['string certificate version', { certificate_version: '2018' }],
    ['fractional certificate version', { certificate_version: 2018.5 }],
    ['missing certificate ID', { certificate_id: undefined }],
    ['numeric certificate ID', { certificate_id: 123 }],
    ['empty certificate ID', { certificate_id: '' }],
    ['missing completeness', { completeness: undefined }],
    ['unknown completeness', { completeness: 'estimated' }],
  ])('rejects a payload with %s', (_label, override) => {
    expect(parsePayload(createCompletePayload(override))).toBeNull()
  })

  it('accepts both supported certificate versions and preserves opaque IDs', () => {
    const record = parsePayload(
      createCompletePayload({
        certificate_version: 2013,
        certificate_id: '000318510-A',
      })
    )

    expect(record).toMatchObject({
      certificateVersion: 2013,
      certificateId: '000318510-A',
    })
  })

  it('ignores unknown top-level keys and emits only normalized fields', () => {
    const record = parsePayload(
      createCompletePayload({
        translation_key: 'unsafe.dynamic.key',
        html: '<script>not executable</script>',
      })
    )

    expect(record).not.toBeNull()
    expect(Object.hasOwn(record!, 'translation_key')).toBe(false)
    expect(Object.hasOwn(record!, 'html')).toBe(false)
    expect(Object.hasOwn(record!, 'schema_version')).toBe(false)
  })
})

describe('parseEnergyCertificateConsumption identity', () => {
  it('accepts only an exact matching string identifier', () => {
    expect(parsePayload(createCompletePayload())).toMatchObject({
      buildingIdentifier: BUILDING_IDENTIFIER,
    })
  })

  it.each([
    ['null', null],
    ['numeric', 103000000],
    ['object', { id: BUILDING_IDENTIFIER }],
    ['empty', ''],
  ])('rejects a %s selected identifier', (_label, selectedIdentifier) => {
    expect(
      parsePayload(createCompletePayload(), selectedIdentifier)
    ).toBeNull()
  })

  it('rejects a missing selected identifier', () => {
    expectRejected({
      energy_certificate_consumption: JSON.stringify(createCompletePayload()),
    })
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['numeric', 103000000],
    ['empty', ''],
    ['different', '103000000B'],
    ['whitespace difference', `${BUILDING_IDENTIFIER} `],
    ['leading-zero difference', `0${BUILDING_IDENTIFIER}`],
  ])('rejects a %s payload identifier', (_label, payloadIdentifier) => {
    expect(
      parsePayload(
        createCompletePayload({ building_identifier: payloadIdentifier })
      )
    ).toBeNull()
  })

  it('does not coerce numerically equivalent selected and payload IDs', () => {
    const payload = createCompletePayload({ building_identifier: '00123' })

    expect(parsePayload(payload, 123)).toBeNull()
    expect(parsePayload(payload, '123')).toBeNull()
  })

  it('fails closed when property access itself throws', () => {
    const properties = Object.defineProperty(
      {},
      'energy_certificate_consumption',
      {
        get: () => {
          throw new Error('untrusted getter')
        },
      }
    )

    expectRejected(properties)
  })
})

describe('parseEnergyCertificateConsumption components', () => {
  it('retains all-zero standard carriers and a zero total', () => {
    const components = STANDARD_COMPONENTS.map(({ carrier }) => ({
      carrier,
      annual_kwh: 0,
    }))

    expect(
      parsePayload(createCompletePayload({ components, total_kwh_year: 0 }))
    ).toMatchObject({
      components: components.map(({ carrier }) => ({
        carrier,
        annualKwh: 0,
      })),
      totalKwhYear: 0,
    })
  })

  it('preserves decimal quantities and every standard source literal', () => {
    const components = [
      { carrier: 'electricity', annual_kwh: 0.1 },
      { carrier: 'district_heat', annual_kwh: 0.2 },
      { carrier: 'district_cooling', annual_kwh: 1.25 },
      { carrier: 'fossil_fuel', annual_kwh: 0 },
      { carrier: 'renewable_fuel', annual_kwh: 0 },
    ]

    expect(
      parsePayload(createCompletePayload({ components, total_kwh_year: 1.55 }))
        ?.components
    ).toEqual([
      { carrier: 'electricity', annualKwh: 0.1 },
      { carrier: 'district_heat', annualKwh: 0.2 },
      { carrier: 'district_cooling', annualKwh: 1.25 },
      { carrier: 'fossil_fuel', annualKwh: 0 },
      { carrier: 'renewable_fuel', annualKwh: 0 },
    ])
  })

  it('preserves named and unnamed other sources and includes them in totals', () => {
    const components = [
      ...STANDARD_COMPONENTS,
      {
        carrier: 'other',
        source_slot: 0,
        name: 'Biokaasu',
        annual_kwh: 3.5,
      },
      { carrier: 'other', source_slot: 2, name: null, annual_kwh: 0 },
    ]

    expect(
      parsePayload(createCompletePayload({
        components,
        total_kwh_year: 18.5,
      }))
    ).toMatchObject({
      completeness: 'complete',
      components: [
        { carrier: 'electricity', annualKwh: 1 },
        { carrier: 'district_heat', annualKwh: 2 },
        { carrier: 'district_cooling', annualKwh: 3 },
        { carrier: 'fossil_fuel', annualKwh: 4 },
        { carrier: 'renewable_fuel', annualKwh: 5 },
        {
          carrier: 'other',
          sourceSlot: 0,
          sourceName: 'Biokaasu',
          annualKwh: 3.5,
        },
        {
          carrier: 'other',
          sourceSlot: 2,
          sourceName: null,
          annualKwh: 0,
        },
      ],
      totalKwhYear: 18.5,
    })
  })

  it('keeps free text inert and discards unrecognized component keys', () => {
    const sourceName = '<img src=x onerror=alert(1)>{{translation.key}}'
    const components = [
      {
        ...STANDARD_COMPONENTS[0],
        translation_key: 'unsafe.dynamic.key',
        html: true,
      },
      ...STANDARD_COMPONENTS.slice(1),
      {
        carrier: 'other',
        source_slot: 1,
        name: sourceName,
        annual_kwh: 2,
        executable: 'doNotRun()',
      },
    ]
    const record = parsePayload(
      createCompletePayload({ components, total_kwh_year: 17 })
    )

    expect(record?.components[0]).toEqual({
      carrier: 'electricity',
      annualKwh: 1,
    })
    expect(record?.components.at(-1)).toEqual({
      carrier: 'other',
      sourceSlot: 1,
      sourceName,
      annualKwh: 2,
    })
  })

  it.each([
    ['missing components', undefined],
    ['null components', null],
    ['object components', {}],
    ['empty components', []],
    ['primitive entry', [1]],
    ['null entry', [null]],
    ['array entry', [[]]],
    ['missing carrier', [{ annual_kwh: 1 }]],
    ['unknown carrier', [{ carrier: 'gas', annual_kwh: 1 }]],
    ['missing quantity', [{ carrier: 'electricity' }]],
    ['null quantity', [{ carrier: 'electricity', annual_kwh: null }]],
    ['string quantity', [{ carrier: 'electricity', annual_kwh: '1' }]],
    ['boolean quantity', [{ carrier: 'electricity', annual_kwh: true }]],
    ['negative quantity', [{ carrier: 'electricity', annual_kwh: -1 }]],
  ])('rejects %s', (_label, components) => {
    expect(
      parsePayload(createCompletePayload({ components }))
    ).toBeNull()
  })

  it('rejects a post-parse nonfinite annual quantity', () => {
    const raw = JSON.stringify(createCompletePayload()).replace(
      '"annual_kwh":1',
      '"annual_kwh":1e400'
    )

    expect(parseRaw(raw)).toBeNull()
  })

  it('rejects duplicate standard carriers', () => {
    expect(
      parsePayload(
        createCompletePayload({
          components: [
            ...STANDARD_COMPONENTS,
            { carrier: 'electricity', annual_kwh: 9 },
          ],
          total_kwh_year: 24,
        })
      )
    ).toBeNull()
  })

  it.each([
    ['missing source slot', { carrier: 'other', name: null, annual_kwh: 1 }],
    [
      'negative source slot',
      { carrier: 'other', source_slot: -1, name: null, annual_kwh: 1 },
    ],
    [
      'out-of-range source slot',
      { carrier: 'other', source_slot: 3, name: null, annual_kwh: 1 },
    ],
    [
      'fractional source slot',
      { carrier: 'other', source_slot: 1.5, name: null, annual_kwh: 1 },
    ],
    [
      'string source slot',
      { carrier: 'other', source_slot: '1', name: null, annual_kwh: 1 },
    ],
    [
      'missing name',
      { carrier: 'other', source_slot: 1, annual_kwh: 1 },
    ],
    [
      'numeric name',
      { carrier: 'other', source_slot: 1, name: 42, annual_kwh: 1 },
    ],
    [
      'boolean name',
      { carrier: 'other', source_slot: 1, name: false, annual_kwh: 1 },
    ],
  ])('rejects an other component with %s', (_label, otherComponent) => {
    expect(
      parsePayload(
        createCompletePayload({
          components: [...STANDARD_COMPONENTS, otherComponent],
          total_kwh_year: 16,
        })
      )
    ).toBeNull()
  })

  it('rejects duplicate other source slots', () => {
    const components = [
      ...STANDARD_COMPONENTS,
      { carrier: 'other', source_slot: 0, name: 'First', annual_kwh: 1 },
      { carrier: 'other', source_slot: 0, name: 'Second', annual_kwh: 2 },
    ]

    expect(
      parsePayload(createCompletePayload({ components, total_kwh_year: 18 }))
    ).toBeNull()
  })
})

describe('parseEnergyCertificateConsumption completeness and totals', () => {
  it('accepts a complete record with exactly the five standard carriers', () => {
    expect(parsePayload(createCompletePayload())).toMatchObject({
      completeness: 'complete',
      totalKwhYear: 15,
    })
  })

  it('rejects a complete record missing a required standard carrier', () => {
    expect(
      parsePayload(
        createCompletePayload({
          components: STANDARD_COMPONENTS.slice(0, -1),
          total_kwh_year: 10,
        })
      )
    ).toBeNull()
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['string', '15'],
    ['negative', -1],
  ])('rejects a complete record with a %s total', (_label, total) => {
    expect(
      parsePayload(createCompletePayload({ total_kwh_year: total }))
    ).toBeNull()
  })

  it('rejects a post-parse nonfinite complete total', () => {
    const raw = JSON.stringify(createCompletePayload()).replace(
      '"total_kwh_year":15',
      '"total_kwh_year":1e400'
    )

    expect(parseRaw(raw)).toBeNull()
  })

  it('rejects a nonfinite computed component sum', () => {
    const components = STANDARD_COMPONENTS.map(({ carrier }) => ({
      carrier,
      annual_kwh: Number.MAX_VALUE,
    }))

    expect(
      parsePayload(
        createCompletePayload({
          components,
          total_kwh_year: Number.MAX_VALUE,
        })
      )
    ).toBeNull()
  })

  it('rejects a meaningfully inconsistent total', () => {
    expect(
      parsePayload(createCompletePayload({ total_kwh_year: 15.01 }))
    ).toBeNull()
  })

  it('accepts ordinary floating-point representation noise', () => {
    const components = [
      { carrier: 'electricity', annual_kwh: 0.1 },
      { carrier: 'district_heat', annual_kwh: 0.2 },
      { carrier: 'district_cooling', annual_kwh: 0 },
      { carrier: 'fossil_fuel', annual_kwh: 0 },
      { carrier: 'renewable_fuel', annual_kwh: 0 },
    ]

    expect(
      parsePayload(createCompletePayload({ components, total_kwh_year: 0.3 }))
    ).toMatchObject({
      completeness: 'complete',
      totalKwhYear: 0.3,
    })
  })

  it('rejects a total just beyond the documented tolerance', () => {
    const components = [
      { carrier: 'electricity', annual_kwh: 0.1 },
      { carrier: 'district_heat', annual_kwh: 0.2 },
      { carrier: 'district_cooling', annual_kwh: 0 },
      { carrier: 'fossil_fuel', annual_kwh: 0 },
      { carrier: 'renewable_fuel', annual_kwh: 0 },
    ]

    expect(
      parsePayload(
        createCompletePayload({ components, total_kwh_year: 0.300000002 })
      )
    ).toBeNull()
  })

  it.each([
    ['absent', undefined],
    ['null', null],
  ])('preserves a partial subset with an %s total', (_label, total) => {
    const payload = createCompletePayload({
      components: [
        { carrier: 'electricity', annual_kwh: 0 },
        { carrier: 'district_cooling', annual_kwh: 2.5 },
      ],
      completeness: 'partial',
      total_kwh_year: total,
    })
    const record = parsePayload(payload)

    expect(record).toMatchObject({
      completeness: 'partial',
      components: [
        { carrier: 'electricity', annualKwh: 0 },
        { carrier: 'district_cooling', annualKwh: 2.5 },
      ],
      totalKwhYear: null,
    })
    expect(record?.components).toHaveLength(2)
  })

  it.each([
    ['numeric', 15],
    ['zero', 0],
    ['string', '15'],
    ['boolean', false],
  ])('rejects a partial record with a non-null %s total', (_label, total) => {
    expect(
      parsePayload(
        createCompletePayload({
          completeness: 'partial',
          total_kwh_year: total,
        })
      )
    ).toBeNull()
  })

  it('does not upgrade a source-partial record with all standard carriers', () => {
    expect(
      parsePayload(
        createCompletePayload({
          completeness: 'partial',
          total_kwh_year: null,
        })
      )
    ).toMatchObject({
      completeness: 'partial',
      totalKwhYear: null,
    })
  })
})

describe('parseEnergyCertificateConsumption optional context', () => {
  it.each([
    '2024-02-29T23:59:59',
    '2024-02-29T23:59:59.123456',
    '2024-02-29T23:59:59Z',
    '2024-02-29T23:59:59+14:00',
    '2024-02-29T23:59:59-05:30',
  ])('preserves a valid timestamp %s exactly', (timestamp) => {
    expect(
      parsePayload(createCompletePayload({ signed_at: timestamp }))
    ).toMatchObject({ signedAt: timestamp })
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['number', 20240229],
    ['empty', ''],
    ['whitespace', '   '],
    ['date only', '2024-02-29'],
    ['space separator', '2024-02-29 12:00:00'],
    ['year zero', '0000-02-29T12:00:00'],
    ['invalid month', '2024-13-01T12:00:00'],
    ['invalid day', '2024-04-31T12:00:00'],
    ['non-leap day', '2025-02-29T12:00:00'],
    ['invalid hour', '2024-02-29T24:00:00'],
    ['invalid minute', '2024-02-29T23:60:00'],
    ['invalid second', '2024-02-29T23:59:60'],
    ['invalid offset hour', '2024-02-29T23:59:59+15:00'],
    ['invalid maximum offset', '2024-02-29T23:59:59+14:01'],
    ['invalid offset minute', '2024-02-29T23:59:59+12:60'],
  ])('omits an unusable signed timestamp: %s', (_label, signedAt) => {
    const record = parsePayload(createCompletePayload({ signed_at: signedAt }))

    expect(record).not.toBeNull()
    expect(record?.signedAt).toBeUndefined()
    expect(record?.validUntil).toBe('2034-03-01T00:00:00')
    expect(record?.heatedNetAreaM2).toBe(123.45)
    expect(record?.totalKwhYear).toBe(15)
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['number', 20340301],
    ['empty', ''],
    ['impossible date', '2034-02-30T00:00:00'],
  ])('omits an unusable valid-until timestamp: %s', (_label, validUntil) => {
    const record = parsePayload(
      createCompletePayload({ valid_until: validUntil })
    )

    expect(record).not.toBeNull()
    expect(record?.validUntil).toBeUndefined()
    expect(record?.signedAt).toBe('2024-02-29T12:34:56.123456')
    expect(record?.heatedNetAreaM2).toBe(123.45)
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['zero', 0],
    ['negative', -1],
    ['numeric string', '123.45'],
    ['boolean', true],
  ])('omits an unusable heated area: %s', (_label, area) => {
    const record = parsePayload(
      createCompletePayload({ heated_net_area_m2: area })
    )

    expect(record).not.toBeNull()
    expect(record?.heatedNetAreaM2).toBeUndefined()
    expect(record?.signedAt).toBe('2024-02-29T12:34:56.123456')
    expect(record?.validUntil).toBe('2034-03-01T00:00:00')
    expect(record?.components).toHaveLength(5)
  })

  it('omits an overflow-to-nonfinite heated area without losing quantities', () => {
    const raw = JSON.stringify(createCompletePayload()).replace(
      '"heated_net_area_m2":123.45',
      '"heated_net_area_m2":1e400'
    )
    const record = parseRaw(raw)

    expect(record).not.toBeNull()
    expect(record?.heatedNetAreaM2).toBeUndefined()
    expect(record?.totalKwhYear).toBe(15)
  })
})

describe('parseEnergyCertificateConsumption live reported payload', () => {
  it('normalizes the exact 1036581819 polygon payload', () => {
    const rawConsumption = JSON.stringify({
      basis: 'standardized_calculation',
      building_identifier: '1036581819',
      certificate_id: '318510',
      certificate_version: 2018,
      completeness: 'complete',
      components: [
        { annual_kwh: 1196074.0, carrier: 'electricity' },
        { annual_kwh: 2994881.0, carrier: 'district_heat' },
        { annual_kwh: 197293.0, carrier: 'district_cooling' },
        { annual_kwh: 0.0, carrier: 'fossil_fuel' },
        { annual_kwh: 0.0, carrier: 'renewable_fuel' },
      ],
      heated_net_area_m2: 22707.2,
      schema_version: 1,
      signed_at: '2023-04-13T11:37:42.080327',
      total_kwh_year: 4388248.0,
      unit: 'kWh/year',
      valid_until: '2033-04-14T00:00:00',
    })

    expect(parseRaw(rawConsumption, '1036581819')).toEqual({
      schemaVersion: 1,
      basis: 'standardized_calculation',
      unit: 'kWh/year',
      certificateVersion: 2018,
      certificateId: '318510',
      buildingIdentifier: '1036581819',
      components: [
        { carrier: 'electricity', annualKwh: 1196074 },
        { carrier: 'district_heat', annualKwh: 2994881 },
        { carrier: 'district_cooling', annualKwh: 197293 },
        { carrier: 'fossil_fuel', annualKwh: 0 },
        { carrier: 'renewable_fuel', annualKwh: 0 },
      ],
      signedAt: '2023-04-13T11:37:42.080327',
      validUntil: '2033-04-14T00:00:00',
      heatedNetAreaM2: 22707.2,
      completeness: 'complete',
      totalKwhYear: 4388248,
    })
  })
})
