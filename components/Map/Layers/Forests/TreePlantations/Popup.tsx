import React from 'react'
import _ from 'lodash'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow, Box } from '@mui/material'

interface Props {
  features: Feature[]
}

const Popup = ({ features }: Props) => {
  const p = features[0].getProperties()
  const { image, spec_simp, type_text, area_ha, peat_ratio, avg_peatdepth } = p
  const isPeat = peat_ratio >= 0.4

  const imageObjs = []
  const images: string[] = image
    .replace(/\.(tif|img|_)/g, '')
    .toUpperCase()
    .split(/[,; ]+/)

  for (const x of images) {
    if (!/LGN\d/.test(x)) {
      continue
    }
    const base = x.replace(/LGN.*/, 'LGN0')
    // Most of the source images seem to fall in these categories.

    // Candidate URLs:
    for (const z of [0, 1, 2]) {
      imageObjs.push({ url: `https://earthexplorer.usgs.gov/metadata/12864/${base + z}/`, title: base + z })
    }
  }

  return (
    <Box sx={{ lineHeight: 1 }}>
      <p>
        <b>Tree plantation (Global Forest Watch)</b>
      </p>
      <p>{spec_simp}</p>
      <p>{type_text}</p>
      {isPeat && <p>Tropical peatland</p>}
      <Table sx={{ width: '500px' }} size={'small'}>
        <TableBody>
          {isPeat && (
            <>
              <TableRow>
                <TableCell>Average peat depth</TableCell>
                <TableCell>{avg_peatdepth.toFixed(1)} metres</TableCell>
              </TableRow>
            </>
          )}
          <TableRow>
            <TableCell>Area</TableCell>
            <TableCell>{_.round(area_ha, 3)}</TableCell>
          </TableRow>
          {isPeat && (
            <TableRow>
              <TableCell>Emission reduction potential when ground water level is raised by 40 cm</TableCell>
              <TableCell>{_.round(19.4 * area_ha)} tons CO2e/year</TableCell>
            </TableRow>
          )}
          <TableRow>
            <TableCell>Landsat source ID</TableCell>
            <TableCell>
              <code>{image}</code>
            </TableCell>
          </TableRow>
          {imageObjs.length > 0 && (
            <TableRow>
              <TableCell>Potential Landsat source images</TableCell>
              <TableCell sx={{ lineHeight: 0.5 }}>
                {imageObjs.map((imageObj) => (
                  <p>
                    <a target="_blank" href={imageObj.url}>
                      {imageObj.title}
                    </a>
                  </p>
                ))}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Box>
  )
}

export default Popup
