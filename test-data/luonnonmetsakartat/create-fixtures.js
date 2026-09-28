#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs')
const path = require('path')
const AdmZip = require('adm-zip')

const SHAPE_TYPE_POLYGON = 5
const WGS84_PRJ =
  'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]'

const fixtures = [
  {
    fileName: 'valid-layer.zip',
    rows: [
      {
        id: 'lm-valid-1',
        nimi: 'Smoke Ridge Forest',
        kunta: 'Espoo',
        maakunta: 'Uusimaa',
        kuvaus: 'Valid smoke fixture area 1',
        pinta_ala: 1.25,
        polygon: [
          [24.85, 60.22],
          [24.858, 60.22],
          [24.858, 60.226],
          [24.85, 60.226],
          [24.85, 60.22],
        ],
      },
      {
        id: 'lm-valid-2',
        nimi: 'Smoke Lakeside Grove',
        kunta: 'Lohja',
        maakunta: 'Uusimaa',
        kuvaus: 'Valid smoke fixture area 2',
        pinta_ala: 2.5,
        polygon: [
          [24.87, 60.232],
          [24.879, 60.232],
          [24.879, 60.238],
          [24.87, 60.238],
          [24.87, 60.232],
        ],
      },
    ],
  },
  {
    fileName: 'duplicate-id-layer.zip',
    rows: [
      {
        id: 'lm-duplicate-1',
        nimi: 'Duplicate Ridge Forest',
        kunta: 'Espoo',
        maakunta: 'Uusimaa',
        kuvaus: 'Duplicate smoke fixture area 1',
        pinta_ala: 1.75,
        polygon: [
          [24.89, 60.224],
          [24.898, 60.224],
          [24.898, 60.23],
          [24.89, 60.23],
          [24.89, 60.224],
        ],
      },
      {
        id: 'lm-duplicate-1',
        nimi: 'Duplicate Lakeside Grove',
        kunta: 'Lohja',
        maakunta: 'Uusimaa',
        kuvaus: 'Duplicate smoke fixture area 2',
        pinta_ala: 2.25,
        polygon: [
          [24.91, 60.236],
          [24.919, 60.236],
          [24.919, 60.242],
          [24.91, 60.242],
          [24.91, 60.236],
        ],
      },
    ],
  },
]

// Additional fixtures reuse the same two tiny WGS84 polygons.
fixtures.push(
  {
    fileName: 'duplicate-name-municipality-layer.zip',
    rows: fixtures[0].rows.map((row) => ({
      ...row,
      nimi: 'Shared Forest',
      kunta: 'Espoo',
    })),
  },
  {
    fileName: 'finnish-layer.zip',
    rows: fixtures[0].rows.map((row, index) => ({
      ...row,
      nimi: index === 0 ? 'Mäntymäki' : 'Öljymäki',
      kunta: 'Hämeenlinna',
    })),
  },
  {
    fileName: 'mojibake-layer.zip',
    rows: fixtures[0].rows.map((row, index) => ({
      ...row,
      nimi: index === 0 ? 'MÃ¤ntymäki' : row.nimi,
    })),
  }
)

const fields = [
  { name: 'id', type: 'C', length: 32 },
  { name: 'nimi', type: 'C', length: 64 },
  { name: 'kunta', type: 'C', length: 32 },
  { name: 'maakunta', type: 'C', length: 32 },
  { name: 'kuvaus', type: 'C', length: 80 },
  { name: 'pinta_ala', type: 'N', length: 10, decimals: 2 },
]

const writeFileHeader = ({ bbox, fileLengthWords }) => {
  const buffer = Buffer.alloc(100)
  buffer.writeInt32BE(9994, 0)
  buffer.writeInt32BE(fileLengthWords, 24)
  buffer.writeInt32LE(1000, 28)
  buffer.writeInt32LE(SHAPE_TYPE_POLYGON, 32)
  buffer.writeDoubleLE(bbox.minX, 36)
  buffer.writeDoubleLE(bbox.minY, 44)
  buffer.writeDoubleLE(bbox.maxX, 52)
  buffer.writeDoubleLE(bbox.maxY, 60)

  return buffer
}

const getPolygonBbox = (points) =>
  points.reduce(
    (bbox, [x, y]) => ({
      minX: Math.min(bbox.minX, x),
      minY: Math.min(bbox.minY, y),
      maxX: Math.max(bbox.maxX, x),
      maxY: Math.max(bbox.maxY, y),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  )

const mergeBboxes = (bboxes) =>
  bboxes.reduce(
    (merged, bbox) => ({
      minX: Math.min(merged.minX, bbox.minX),
      minY: Math.min(merged.minY, bbox.minY),
      maxX: Math.max(merged.maxX, bbox.maxX),
      maxY: Math.max(merged.maxY, bbox.maxY),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    }
  )

const buildPolygonRecordContent = (points) => {
  const bbox = getPolygonBbox(points)
  const buffer = Buffer.alloc(48 + points.length * 16)
  buffer.writeInt32LE(SHAPE_TYPE_POLYGON, 0)
  buffer.writeDoubleLE(bbox.minX, 4)
  buffer.writeDoubleLE(bbox.minY, 12)
  buffer.writeDoubleLE(bbox.maxX, 20)
  buffer.writeDoubleLE(bbox.maxY, 28)
  buffer.writeInt32LE(1, 36)
  buffer.writeInt32LE(points.length, 40)
  buffer.writeInt32LE(0, 44)

  points.forEach(([x, y], index) => {
    const offset = 48 + index * 16
    buffer.writeDoubleLE(x, offset)
    buffer.writeDoubleLE(y, offset + 8)
  })

  return { bbox, buffer }
}

const buildShpAndShx = (rows) => {
  const records = rows.map((row) => buildPolygonRecordContent(row.polygon))
  const bbox = mergeBboxes(records.map((record) => record.bbox))
  const shpLengthBytes =
    100 + records.reduce((sum, record) => sum + 8 + record.buffer.length, 0)
  const shpChunks = [
    writeFileHeader({ bbox, fileLengthWords: shpLengthBytes / 2 }),
  ]
  const shxRecords = []
  let offsetWords = 50

  records.forEach((record, index) => {
    const recordHeader = Buffer.alloc(8)
    const contentLengthWords = record.buffer.length / 2
    recordHeader.writeInt32BE(index + 1, 0)
    recordHeader.writeInt32BE(contentLengthWords, 4)
    shpChunks.push(recordHeader, record.buffer)

    const shxRecord = Buffer.alloc(8)
    shxRecord.writeInt32BE(offsetWords, 0)
    shxRecord.writeInt32BE(contentLengthWords, 4)
    shxRecords.push(shxRecord)

    offsetWords += 4 + contentLengthWords
  })

  const shxLengthBytes = 100 + shxRecords.length * 8
  const shxChunks = [
    writeFileHeader({ bbox, fileLengthWords: shxLengthBytes / 2 }),
    ...shxRecords,
  ]

  return {
    shp: Buffer.concat(shpChunks),
    shx: Buffer.concat(shxChunks),
  }
}

const writePadded = ({ buffer, length, offset, value, align = 'left' }) => {
  const raw = Buffer.isBuffer(value)
    ? value
    : Buffer.from(String(value ?? ''), 'utf8')
  const target = Buffer.alloc(length, 0x20)

  if (align === 'right') {
    raw.copy(target, Math.max(0, length - raw.length), 0, length)
  } else {
    raw.copy(target, 0, 0, length)
  }

  target.copy(buffer, offset)
}

const buildDbf = ({ rows, selectedFields = fields }) => {
  const headerLength = 32 + selectedFields.length * 32 + 1
  const recordLength =
    1 + selectedFields.reduce((sum, field) => sum + field.length, 0)
  const buffer = Buffer.alloc(headerLength + rows.length * recordLength + 1, 0)

  buffer.writeUInt8(0x03, 0)
  buffer.writeUInt8(126, 1)
  buffer.writeUInt8(1, 2)
  buffer.writeUInt8(1, 3)
  buffer.writeUInt32LE(rows.length, 4)
  buffer.writeUInt16LE(headerLength, 8)
  buffer.writeUInt16LE(recordLength, 10)

  selectedFields.forEach((field, index) => {
    const offset = 32 + index * 32
    Buffer.from(field.name, 'ascii').copy(buffer, offset, 0, 10)
    buffer.write(field.type, offset + 11, 1, 'ascii')
    buffer.writeUInt8(field.length, offset + 16)
    buffer.writeUInt8(field.decimals ?? 0, offset + 17)
  })
  buffer.writeUInt8(0x0d, headerLength - 1)

  rows.forEach((row, rowIndex) => {
    let offset = headerLength + rowIndex * recordLength
    buffer.writeUInt8(0x20, offset)
    offset += 1

    selectedFields.forEach((field) => {
      const rawValue = row[field.name]
      const value =
        field.type === 'N' && typeof rawValue === 'number'
          ? rawValue.toFixed(field.decimals ?? 0)
          : rawValue
      writePadded({
        buffer,
        length: field.length,
        offset,
        value,
        align: field.type === 'N' ? 'right' : 'left',
      })
      offset += field.length
    })
  })

  buffer.writeUInt8(0x1a, buffer.length - 1)

  return buffer
}

const buildFixture = ({ fileName, rows, selectedFields }) => {
  const baseName = path.basename(fileName, '.zip')
  const { shp, shx } = buildShpAndShx(rows)
  const dbf = buildDbf({ rows, selectedFields })
  const zip = new AdmZip()

  zip.addFile(`${baseName}.shp`, shp)
  zip.addFile(`${baseName}.shx`, shx)
  zip.addFile(`${baseName}.dbf`, dbf)
  zip.addFile(`${baseName}.prj`, Buffer.from(WGS84_PRJ, 'ascii'))
  zip.addFile(`${baseName}.cpg`, Buffer.from('UTF-8\n', 'ascii'))
  for (const entry of zip.getEntries()) {
    // ZIP stores local calendar fields; keep identical bytes in every timezone.
    entry.header.time = new Date(2026, 6, 1, 19, 5, 52)
    entry.attr = 2175008768
  }
  return zip.toBuffer()
}

const generateFixtures = (outputDir = __dirname) => {
  fs.mkdirSync(outputDir, { recursive: true })
  for (const fixture of fixtures) {
    fs.writeFileSync(
      path.join(outputDir, fixture.fileName),
      buildFixture(fixture)
    )
  }
}

module.exports = { fixtures, fields, buildFixture, generateFixtures }

if (require.main === module) {
  const outputDir = process.argv[2] || __dirname
  generateFixtures(outputDir)
  console.log(`Wrote ${fixtures.length} fixtures to ${outputDir}`)
}
