import React, { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { T } from '@tolgee/react'

import { MapGraphData } from 'applets/hiilikartta/common/types'

type Props = {
  datas: MapGraphData[]
  activeYear: string
}

const CarbonMapGraphTable = ({ datas, activeYear }: Props) => {
  const co2HaRowData = useMemo(() => {
    return datas.map((data) => {
      const totalArea = data.data.features.reduce((acc, feature) => {
        const properties = feature.properties
        if (!properties.isHidden) {
          return acc + properties.area
        }
        return acc
      }, 0)

      const weightedAreaHa = data.data.features.reduce((acc, feature) => {
        const properties = feature.properties
        if (!properties.isHidden) {
          return acc + properties.valueHa * (properties.area / totalArea)
        }
        return acc
      }, 0)

      return weightedAreaHa
    })
  }, [datas])

  const co2TotalRowData = useMemo(() => {
    return datas.map((data) => {
      const total = data.data.features.reduce((acc, feature) => {
        const properties = feature.properties
        if (!properties.isHidden) {
          return acc + properties.valueTotal
        }
        return acc
      }, 0)

      return total
    })
  }, [datas])

  return (
    <TableContainer>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell sx={{ border: 0 }}>
              <T ns="hiilikartta" keyName="report.map_graph.year"></T>
              {activeYear}
            </TableCell>
            {datas.map((data, index) => (
              <TableCell key={index} sx={{ border: 0 }}>
                {data.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={'co2_ha'} sx={{ '&:*': { border: 0 } }}>
            <TableCell component="th" scope="row">
              <T ns="hiilikartta" keyName="report.map_graph.unit_co2_ha"></T>
            </TableCell>
            {co2HaRowData.map((rowData, index) => (
              <TableCell key={index} align="right">
                {rowData}
              </TableCell>
            ))}
          </TableRow>
          <TableRow key={'co2_total'} sx={{ '&:*': { border: 0 } }}>
            <TableCell component="th" scope="row">
              <T ns="hiilikartta" keyName="report.map_graph.unit_co2_total"></T>
            </TableCell>
            {co2TotalRowData.map((rowData, index) => (
              <TableCell key={index} align="right">
                {rowData}
              </TableCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default CarbonMapGraphTable
