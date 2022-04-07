import React from 'react';
import withStyles from '@mui/styles/withStyles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import MuiTableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import GpsFixed from '@mui/icons-material/GpsFixed';

import { Button } from '@mui/material';


const TableCell = withStyles(theme => ({
  head: {
    fontWeight: 600,
    whiteSpace: 'nowrap',
  },
  body: {
    backgroundColor: '#F7F9FA',
  },
}))(MuiTableCell);


const Button2 = withStyles(theme => ({
  label: {
    marginRight: -20,
  },
}))(Button);


export function SimpleTable({rows}) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Statistic</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.name}>
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell align="right">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function HeaderTable({title, onFitLayerBounds, rows}) {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>{title}</TableCell>
            <TableCell align="right">
              <Button2 onClick={onFitLayerBounds} size="small"><GpsFixed fontSize="small" /></Button2>
              </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map(row => (
            <TableRow key={row.name}>
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell align="right">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

