import React, { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import { styled } from '@mui/material/styles'
import { T } from '@tolgee/react'

import { pp } from '#/common/utils/general'

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

      const weightedAreaHa = data.data.features.reduce(
        (acc, feature) => {
          const properties = feature.properties
          if (!properties.isHidden) {
            return {
              planned:
                acc.planned +
                properties.valueHa * (properties.area / totalArea),
              nochange:
                acc.nochange +
                properties.valueHaNochange * (properties.area / totalArea),
            }
          }
          return acc
        },
        { planned: 0, nochange: 0 }
      )

      return weightedAreaHa
    })
  }, [datas])

  const co2TotalRowData = useMemo(() => {
    return datas.map((data) => {
      const totals = data.data.features.reduce(
        (acc, feature) => {
          const properties = feature.properties
          if (!properties.isHidden) {
            return {
              planned: acc.planned + properties.valueTotal,
              nochange: acc.nochange + properties.valueTotalNochange,
            }
          }
          return acc
        },
        { planned: 0, nochange: 0 }
      )

      return totals
    })
  }, [datas])

  return (
    <TableContainer sx={{ mt: 4, overFlowX: 'scroll' }}>
      <Table
        sx={{ borderCollapse: 'collapse', 'th, td': { border: 0 } }}
        aria-label="simple table"
      >
        <TableHead>
          <TableRow>
            <TableCell
              sx={{
                typography: 'h8',
                color: 'secondary.dark',
                verticalAlign: 'top',
              }}
            >
              <T ns="hiilikartta" keyName="report.map_graph.year"></T>
              <b>{' ' + activeYear}</b>
            </TableCell>
            {datas.map((data, index) => (
              <TableCell
                sx={{
                  typography: 'h7',
                  lineHeight: 'normal',
                  verticalAlign: 'top',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  minWidth: '8rem',
                }}
                key={index}
              >
                {data.name}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={'co2_ha'}>
            <FirstColumnCell component="th" scope="row">
              <T
                ns="hiilikartta"
                keyName="report.map_graph.unit_co2_ha_compared"
              ></T>
            </FirstColumnCell>
            {co2HaRowData.map((rowData, index) => (
              <DataCell key={index} align="left">
                {pp(rowData.planned, 0)}
              </DataCell>
            ))}
          </TableRow>
          <TableRow key={'co2_total'}>
            <FirstColumnCell
              sx={{ typography: 'body7' }}
              component="th"
              scope="row"
            >
              <T
                ns="hiilikartta"
                keyName="report.map_graph.unit_co2_total_compared"
              ></T>
            </FirstColumnCell>
            {co2TotalRowData.map((rowData, index) => (
              <DataCell key={index} align="left">
                {pp(rowData.planned, 0)}
              </DataCell>
            ))}
          </TableRow>
          <TableRow sx={{ height: '2rem' }}></TableRow>
        </TableBody>
        <TableHead>
          <TableRow>
            <TableCell></TableCell>
            {datas.map((data, index) => (
              <TableCell
                sx={{
                  typography: 'h7',
                  lineHeight: 'normal',
                  verticalAlign: 'top',
                  wordBreak: 'break-word',
                  overflowWrap: 'break-word',
                  minWidth: '8rem',
                }}
                key={index}
              >
                <T
                  ns="hiilikartta"
                  keyName="report.map_graph.table_current_situation"
                ></T>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow key={'co2_ha'}>
            <FirstColumnCell component="th" scope="row">
              <T
                ns="hiilikartta"
                keyName="report.map_graph.unit_co2_ha_compared"
              ></T>
            </FirstColumnCell>
            {co2HaRowData.map((rowData, index) => (
              <DataCell key={index} align="left">
                {pp(rowData.nochange, 0)}
              </DataCell>
            ))}
          </TableRow>
          <TableRow key={'co2_total'}>
            <FirstColumnCell
              sx={{ typography: 'body7' }}
              component="th"
              scope="row"
            >
              <T
                ns="hiilikartta"
                keyName="report.map_graph.unit_co2_total_compared"
              ></T>
            </FirstColumnCell>
            {co2TotalRowData.map((rowData, index) => (
              <DataCell key={index} align="left">
                {pp(rowData.nochange, 0)}
              </DataCell>
            ))}
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  )
}

const FirstColumnCell = styled(TableCell)(({ theme }) => ({
  ...theme.typography.body7,
}))

const DataCell = styled(TableCell)(({ theme }) => ({
  ...theme.typography.h2,
  fontSize: '1.25rem',
  letterSpacing: '0.125rem',
}))

export default CarbonMapGraphTable
