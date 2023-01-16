import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow } from '@mui/material'
import _ from 'lodash'

interface Props {
  features: Feature[]
}

const Popup = ({ features }: Props) => {
  const p = features[0].getProperties()

  return (
    <Table sx={{ width: '500px' }} size={'small'}>
      <TableBody>
        <TableRow>
          <TableCell>Certificate ID</TableCell>
          <TableCell>
            <p>ugabaga</p>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}

export default Popup
