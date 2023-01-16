import React from 'react'
import { Button, Table, TableBody, Paper, TableCell, TableContainer, TableHead, TableRow, styled } from '@mui/material'

import { GpsFixed } from '@mui/icons-material'

// TODO: Fix types (add proper prop typing, etc)

export const SimpleTable = ({ rows }: any) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <StyledTableCell align="right">Value</StyledTableCell>
            <StyledTableCell>Statistic</StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row: any) => (
            <TableRow key={row.name}>
              <StyledTableCell component="th" scope="row">
                {row.name}
              </StyledTableCell>
              <StyledTableCell align="right">{row.value}</StyledTableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export const HeaderTable = ({ title, onFitLayerBounds, rows }: any) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <StyledTableCell>{title}</StyledTableCell>
            <StyledTableCell align="right">
              <StyledButton onClick={onFitLayerBounds} size="small">
                <GpsFixed fontSize="small" />
              </StyledButton>
            </StyledTableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row: any) => (
            <TableRow key={row.name}>
              <StyledTableCell component="th" scope="row">
                {row.name}
              </StyledTableCell>
              <StyledTableCell align="right">{row.value}</StyledTableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

const StyledTableCell = styled(TableCell)({
  head: {
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  body: {
    backgroundColor: '#F7F9FA',
  },
})

const StyledButton = styled(Button)({
  label: {
    marginRight: -20,
  },
})
