import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import _ from 'lodash'

interface IBuildingSchemaVRK {
  building_id: string
  region: string
  municipality: string
  street: string
  house_number: string
  postal_code: string
  building_use: number
}
interface IBuildingSchemaNLS {
  gid: number
  sijaintitarkkuus: number
  aineistolahde: number
  alkupvm: string
  kohderyhma: number
  kohdeluokka: number
  korkeustarkkuus: number
  kayttotarkoitus: number
  kerrosluku: number
  pohjankorkeus: number
  korkeusarvo: number

  st_area: number
}
interface IBuildingSchema {
  id: number
  building_id: string
  gid: number
  distance_poly?: number
  distance_centroid?: number
}

interface Props {
  f: Feature
}

const popup = ({ f }: Props) => {
  let p = null

  let vrk = <></>
  let nls = <></>
  const props = f.getProperties() as IBuildingSchema

  if (props.building_id) {
    p = props as unknown as IBuildingSchemaVRK

    vrk = (
      <>
        <TableRow>
          <TableCell>
            <address>
              {p.street} {p.house_number}, {p.postal_code}
            </address>
          </TableCell>
        </TableRow>
        <TableRow>
          <TableCell>Building ID</TableCell>
          <TableCell>{p.building_id}</TableCell>
        </TableRow>
      </>
    )
  }

  if (props.gid) {
    p = props as unknown as IBuildingSchemaNLS
    const approxArea = 0.888 * p.st_area
    const approxVolume = 3.5 * approxArea

    const floorCountCodes: any = {
      0: 'Unspecified',
      1: '1 or 2 floors',
      2: '3 or more floors',
    }
    const floorCount = floorCountCodes[p.kerrosluku] || 'Unknown'

    nls = (
      <>
        <TableRow>
          <TableCell>Floor count</TableCell>
          <TableCell>{floorCount}</TableCell>
        </TableRow>
        {approxArea > 1 && (
          <TableRow>
            <TableCell>Estimated floorage</TableCell>
            <TableCell>
              {_.round(approxArea, 2)} m<sup>2</sup> per floor
            </TableCell>
          </TableRow>
        )}
        {approxArea > 1 && approxVolume && (
          <TableRow>
            <TableCell>Estimated volume</TableCell>
            <TableCell>
              {_.round(approxVolume, 2)} m<sup>3</sup> per floor
            </TableCell>
          </TableRow>
        )}
      </>
    )
  }

  return (
    <Table sx={{ width: '500px' }} size={'small'}>
      <TableBody>
        {vrk}
        {nls}
      </TableBody>
    </Table>
  )
}

export default popup
