/** @jest-environment node */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
const AdmZip = jest.requireActual('adm-zip')
import {
  detectShapefileColumns,
  findBestColumnMatch,
  getFeatureColumns,
  mergeShapefileCollections,
  parseFolayerShapefile,
  validateShapefile,
  folayerDataFindDuplicateIds,
  folayerDataFindDuplicateNameMunicipalityPairs,
  folayerDataValidateColumnValues,
} from './folayerShapefile'
import {
  fixtureBytes,
  fixtureDir,
  collection,
  toArrayBuffer,
  expectedColumns,
} from './shapefileTestData'
import {
  buildFixture,
  fixtures,
  fields,
  generateFixtures,
} from '../../../../test-data/luonnonmetsakartat/create-fixtures'

const archiveWithout = (extension: string) => {
  const zip = new AdmZip(Buffer.from(new Uint8Array(fixtureBytes())))
  zip.deleteFile(`valid-layer.${extension}`)
  return toArrayBuffer(zip.toBuffer())
}
const validateRows = (
  rows: Parameters<typeof collection>[0],
  indexingStrategy: 'id' | 'name_municipality' = 'id'
) =>
  validateShapefile({
    geojson: collection(rows),
    selection: { ...expectedColumns, indexingStrategy },
  })

it('parses two real WGS84 polygons with exact properties and detects all six columns', async () => {
  const geojson = await parseFolayerShapefile(fixtureBytes())
  expect(geojson.features).toHaveLength(2)
  expect(geojson.features[0].properties).toEqual({
    id: 'lm-valid-1',
    nimi: 'Smoke Ridge Forest',
    kunta: 'Espoo',
    maakunta: 'Uusimaa',
    kuvaus: 'Valid smoke fixture area 1',
    pinta_ala: 1.25,
  })
  expect(geojson.features[1].properties).toEqual({
    id: 'lm-valid-2',
    nimi: 'Smoke Lakeside Grove',
    kunta: 'Lohja',
    maakunta: 'Uusimaa',
    kuvaus: 'Valid smoke fixture area 2',
    pinta_ala: 2.5,
  })
  const geometry = geojson.features[0].geometry
  expect(geometry.type).toBe('Polygon')
  if (geometry.type !== 'Polygon') throw new Error('Expected polygon')
  expect(geometry.coordinates[0]).toHaveLength(5)
  expect(geometry.coordinates[0][0][0]).toBeCloseTo(24.85, 10)
  expect(geometry.coordinates[0][0][1]).toBeCloseTo(60.22, 10)
  expect(detectShapefileColumns(getFeatureColumns(geojson))).toEqual(
    expectedColumns
  )
})

it.each(['shx', 'prj', 'cpg'])(
  'tolerates missing %s for this ASCII, already-WGS84 archive',
  async (part) => {
    expect(
      (await parseFolayerShapefile(archiveWithout(part))).features
    ).toHaveLength(2)
  }
)
it('missing DBF parses geometry but blocks required column selection', async () => {
  const geojson = await parseFolayerShapefile(archiveWithout('dbf'))
  expect(geojson.features).toHaveLength(2)
  expect(getFeatureColumns(geojson)).toEqual([])
  expect(validateShapefile({ geojson, selection: expectedColumns }).error).toBe(
    'columns'
  )
})
it.each([
  ['missing SHP', (): ArrayBuffer => archiveWithout('shp')],
  ['not ZIP', () => toArrayBuffer(Buffer.from('not a zip'))],
  ['truncated ZIP', () => fixtureBytes().slice(0, 80)],
  ['empty ZIP', (): ArrayBuffer => toArrayBuffer(new AdmZip().toBuffer())],
  ['empty bytes', () => new ArrayBuffer(0)],
  ['absent bytes', (): undefined => undefined],
  ...['dbf', 'shp'].map(
    (part) =>
      [
        `truncated ${part}`,
        (): ArrayBuffer => {
          const zip = new AdmZip(Buffer.from(new Uint8Array(fixtureBytes())))
          zip.updateFile(`valid-layer.${part}`, Buffer.alloc(8))
          return toArrayBuffer(zip.toBuffer())
        },
      ] as const
  ),
] as const)(
  'rejects %s safely without depending on dependency error text',
  async (_label, bytes) => {
    await expect(parseFolayerShapefile(bytes())).rejects.toThrow()
  }
)
it('rejects a real empty feature collection in a ZIP', async () => {
  const zip = new AdmZip()
  zip.addFile('empty.geojson', Buffer.from(JSON.stringify(collection([]))))
  await expect(
    parseFolayerShapefile(toArrayBuffer(zip.toBuffer()))
  ).rejects.toThrow('no features')
})
it('merges homogeneous collections and handles absent properties and empty collections', () => {
  const first = collection([{ id: 1 }])
  const second = collection([{ id: 2 }])
  expect(mergeShapefileCollections([first, second]).features).toEqual([
    ...first.features,
    ...second.features,
  ])
  expect(mergeShapefileCollections(first)).toEqual(first)
  expect(getFeatureColumns(collection([]))).toEqual([])
  expect(getFeatureColumns(collection([null]))).toEqual([])
})
it('detects case-insensitively with exact-first candidate precedence and original spelling', () => {
  expect(
    detectShapefileColumns([
      'FID',
      'ID',
      'nimi',
      'NAME',
      'KUNTA',
      'region',
      'desc',
      'pinta_ala',
    ])
  ).toEqual({
    indexingStrategy: 'id',
    idCol: 'ID',
    nameCol: 'NAME',
    municipalityCol: 'KUNTA',
    regionCol: 'region',
    descriptionCol: 'desc',
    areaCol: 'pinta_ala',
  })
  expect(
    findBestColumnMatch({
      columns: ['pinta_ala', 'AREA'],
      candidates: ['ALA', 'AREA', 'PINTA'],
      allowPartial: true,
    })
  ).toBe('AREA')
  expect(detectShapefileColumns(['tunnus', 'nimi', 'kunta'])).toMatchObject({
    idCol: 'tunnus',
    descriptionCol: undefined,
    areaCol: undefined,
  })
})
it('retains available configured fields, repairs missing required fields, clears missing optional fields', () => {
  expect(
    detectShapefileColumns(['id', 'nimi', 'kunta', 'custom'], {
      ...expectedColumns,
      nameCol: 'custom',
    })
  ).toEqual({
    ...expectedColumns,
    nameCol: 'custom',
    regionCol: undefined,
    descriptionCol: undefined,
    areaCol: undefined,
  })
  expect(
    detectShapefileColumns(['id', 'nimi', 'kunta'], {
      ...expectedColumns,
      nameCol: 'old',
    }).nameCol
  ).toBe('nimi')
})
it.each(['idCol', 'nameCol', 'municipalityCol'] as const)(
  'blocks missing, cleared or nonexistent required %s',
  (field) => {
    for (const value of [undefined, '', 'stale']) {
      expect(
        validateShapefile({
          geojson: collection([{ id: 'a', nimi: 'A', kunta: 'B' }]),
          selection: { ...expectedColumns, [field]: value },
        }).error
      ).toBe('columns')
    }
  }
)
it('allows absent ID in pair mode and strips absent optional selections', () => {
  expect(
    validateRows([{ nimi: 'A', kunta: 'B' }], 'name_municipality')
  ).toMatchObject({
    colOptions: {
      indexingStrategy: 'name_municipality',
      nameCol: 'nimi',
      municipalityCol: 'kunta',
      idCol: undefined,
      areaCol: undefined,
      descriptionCol: undefined,
      regionCol: undefined,
    },
  })
})
it.each([
  ['duplicate-id-layer.zip', 'id', 'name_municipality', ['lm-duplicate-1']],
  [
    'duplicate-name-municipality-layer.zip',
    'name_municipality',
    'id',
    ['Shared Forest - Espoo'],
  ],
] as const)(
  'real %s blocks only its indexing strategy',
  async (file, blocked, accepted, duplicates) => {
    const geojson = await parseFolayerShapefile(fixtureBytes(file))
    expect(
      validateShapefile({
        geojson,
        selection: { ...expectedColumns, indexingStrategy: blocked },
      })
    ).toMatchObject({ error: blocked, duplicates })
    expect(
      validateShapefile({
        geojson,
        selection: { ...expectedColumns, indexingStrategy: accepted },
      }).error
    ).toBeUndefined()
  }
)
it('counts zero and numeric/string IDs equally, deduplicates output, and handles object prototype names', () => {
  const ids = [
    0,
    '0',
    7,
    '7',
    '7',
    'constructor',
    'constructor',
    '__proto__',
    '__proto__',
    '',
    '',
    null,
    undefined,
    'A',
    'a',
    ' A ',
  ]
  expect(
    folayerDataFindDuplicateIds(collection(ids.map((id) => ({ id }))), 'id')
  ).toEqual(['0', '7', 'constructor', '__proto__', ''])
})
it('does not confuse distinct tuples with the same display label; retains case-sensitive truthy pair policy', () => {
  const rows = [
    { nimi: 'A - B', kunta: 'C' },
    { nimi: 'A', kunta: 'B - C' },
    { nimi: '', kunta: 'C' },
    { nimi: '', kunta: 'C' },
    { nimi: 'a', kunta: 'B - C' },
  ]
  expect(
    folayerDataFindDuplicateNameMunicipalityPairs(
      collection(rows),
      'nimi',
      'kunta'
    )
  ).toEqual([])
  expect(
    folayerDataFindDuplicateNameMunicipalityPairs(
      collection([...rows, rows[0], rows[0]]),
      'nimi',
      'kunta'
    )
  ).toEqual(['A - B - C'])
})
it.each(['', '   ', null, undefined, 0, 7, 'not/a/uuid', 'a_b', '😀'])(
  'does not invent an ID format rule for %p',
  (id) => {
    expect(validateRows([{ id, nimi: 'A', kunta: 'B' }]).error).toBeUndefined()
  }
)
it.each(['', '   ', null, undefined, 0, 7])(
  'characterizes permissive string value handling for %p',
  (value) => {
    expect(
      folayerDataValidateColumnValues(collection([{ name: value }]), 'name')
    ).toEqual({ invalidChars: [], encodingErrors: [] })
    expect(
      validateRows(
        [{ id: 'a', nimi: value, kunta: value }],
        'name_municipality'
      ).error
    ).toBeUndefined()
  }
)
it('validates only the documented alphabet; lists invalid and encoding values once', () => {
  expect(
    folayerDataValidateColumnValues(
      collection(
        ['Mäntymäki ÅÖåäö', 'A-1\nB', 'a_b', 'é', '�', 'Ã¤', 'Ã¤'].map(
          (name) => ({ name })
        )
      ),
      'name'
    )
  ).toEqual({ invalidChars: ['a_b', 'é', '�', 'Ã¤'], encodingErrors: ['Ã¤'] })
  expect(folayerDataValidateColumnValues(undefined, 'name')).toEqual({
    invalidChars: [],
    encodingErrors: [],
  })
})
it('ignores optional description/area text; region warnings apply only to ID mode', () => {
  const row = {
    id: 'a',
    nimi: 'A',
    kunta: 'B',
    maakunta: 'a_b',
    kuvaus: 'arbitrary 😀',
    pinta_ala: 'unvalidated',
  }
  expect(validateRows([row])).toMatchObject({
    warnings: ['maakunta'],
    invalidValues: ['a_b'],
  })
  expect(validateRows([row], 'name_municipality')).toMatchObject({
    warnings: [],
    invalidValues: [],
  })
})
it('real UTF-8 Finnish names pass, real mojibake blocks pairs and warns IDs', async () => {
  const finnish = await parseFolayerShapefile(fixtureBytes('finnish-layer.zip'))
  expect(finnish.features.map((feature) => feature.properties?.nimi)).toEqual([
    'Mäntymäki',
    'Öljymäki',
  ])
  expect(
    validateShapefile({
      geojson: finnish,
      selection: { ...expectedColumns, indexingStrategy: 'name_municipality' },
    }).error
  ).toBeUndefined()
  const mojibake = await parseFolayerShapefile(
    fixtureBytes('mojibake-layer.zip')
  )
  expect(mojibake.features[0].properties?.nimi).toBe('MÃ¤ntymäki')
  expect(
    validateShapefile({ geojson: mojibake, selection: expectedColumns })
  ).toMatchObject({ warnings: ['nimi'], invalidValues: ['MÃ¤ntymäki'] })
  expect(
    validateShapefile({
      geojson: mojibake,
      selection: { ...expectedColumns, indexingStrategy: 'name_municipality' },
    }).error
  ).toBe('strings')
})
it('builds optional-column and invalid UTF-8 variants without tracked-file writes', async () => {
  const bytes = buildFixture({
    ...fixtures[0],
    selectedFields: fields.filter((field) =>
      ['id', 'nimi', 'kunta'].includes(field.name)
    ),
    rows: fixtures[0].rows.map((row, index) => ({
      ...row,
      nimi: index === 0 ? Buffer.from([0xc3, 0x28]) : row.nimi,
    })),
  })
  const geojson = await parseFolayerShapefile(toArrayBuffer(bytes))
  expect(getFeatureColumns(geojson)).toEqual(['id', 'nimi', 'kunta'])
  expect(geojson.features[0].properties?.nimi).toBe('�(')
  expect(
    validateShapefile({
      geojson,
      selection: { ...expectedColumns, indexingStrategy: 'name_municipality' },
    }).error
  ).toBe('strings')
})
it('generates all committed archives byte-identically in two fresh directories and CLI regeneration', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lm-fixtures-'))
  try {
    generateFixtures(path.join(root, 'one'))
    generateFixtures(path.join(root, 'two'))
    execFileSync(
      process.execPath,
      [path.join(fixtureDir, 'create-fixtures.js'), path.join(root, 'two')],
      { env: { ...process.env, TZ: 'Pacific/Honolulu' } }
    )
    for (const { fileName } of fixtures) {
      const bytes = fs.readFileSync(path.join(root, 'one', fileName))
      expect(bytes).toEqual(fs.readFileSync(path.join(root, 'two', fileName)))
      expect(bytes).toEqual(fs.readFileSync(path.join(fixtureDir, fileName)))
      expect(bytes.length).toBeLessThan(2000)
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})

it('hard duplicate errors cannot be bypassed by confirming text warnings', () => {
  expect(
    validateRows([
      { id: 'a', nimi: 'bad_', kunta: 'B' },
      { id: 'a', nimi: 'other_', kunta: 'B' },
    ])
  ).toMatchObject({ error: 'id', duplicates: ['a'], warnings: [] })
})
