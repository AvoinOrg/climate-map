import React from 'react';
import { makeStyles, useTheme, Theme, createStyles } from '@material-ui/core/styles';

import ButtonGroup from '@material-ui/core/ButtonGroup';

import SatelliteIcon from '@material-ui/icons/Satellite';

import ExploreIcon from '@material-ui/icons/Explore';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';

import GpsFixedIcon from '@material-ui/icons/GpsFixed';

import * as Map from '../../map/map'
import { Button } from '@material-ui/core';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    iconGroup: {
      position: 'absolute',
      top: theme.spacing(2),
      right: theme.spacing(2),
      zIndex: 1000, /* force this to be on top of the map */
    },
    btn: {
      color: '#333333',
      backgroundColor: "white",
      '&:hover': {
        backgroundColor: "#eeeeee"
      }
    },
    divider: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    }
  }),
);
export default function GroupOrientation() {
  const theme = useTheme();
  const classes = useStyles(theme);

  return (
    <div className={classes.iconGroup}>
      <ButtonGroup
        orientation="vertical"
      >
        <Button onClick={Map.mapToggleTerrain} size="small" className={classes.btn}><SatelliteIcon fontSize="small" /></Button>
        {/* <Divider className={classes.divider}/> */}
        <Button onClick={Map.mapResetNorth} size="small" className={classes.btn}><ExploreIcon fontSize="small" /></Button>
        <Button onClick={Map.mapZoomIn} size="small" className={classes.btn}><AddIcon fontSize="small" /></Button>
        <Button onClick={Map.mapZoomOut} size="small" className={classes.btn}><RemoveIcon fontSize="small" /></Button>
        {/* <Divider className={classes.divider}/> */}
        <Button onClick={Map.mapRelocate} size="small" className={classes.btn}><GpsFixedIcon fontSize="small" /></Button>
      </ButtonGroup>
    </div>
  );
}
