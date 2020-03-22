import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import MuiTableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import GpsFixed from '@material-ui/icons/GpsFixed';

import { Button } from '@material-ui/core';
import { pp } from 'src/map/utils';



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


const rows = [
  {name: 'Forest area', value: `${pp(12345678, 3)} ha` },
  {name: 'Main tree species', value: 'Pine' },
  {name: 'Forest age', value: `${pp(123, 2)} years` },
  {name: 'Biomass volume', value: `${pp(123.45, 2)} m³/ha` },
  {name: 'Average carbon balance*', value: `${pp(123,2)} tn CO2e/ha/y` },
];

export function SimpleTable() {

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

export function HeaderTable() {

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Finland's forests</TableCell>
            <TableCell align="right">
              <Button2 onClick={() => alert('asd')} size="small"><GpsFixed fontSize="small" /></Button2>
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

