import React from 'react';
import { makeStyles, useTheme, Theme, createStyles } from '@material-ui/core/styles';
import { positions } from '@material-ui/system';

import IconButton from '@material-ui/core/IconButton';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import Divider from '@material-ui/core/Divider';

import SatelliteIcon from '@material-ui/icons/Satellite';

import ExploreIcon from '@material-ui/icons/Explore';
import AddIcon from '@material-ui/icons/Add';
import RemoveIcon from '@material-ui/icons/Remove';

import GpsFixedIcon from '@material-ui/icons/GpsFixed';

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    iconGroup: {
      position: 'absolute',
      top: theme.spacing(12),
      right: theme.spacing(2),
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
        <IconButton size="small" className={classes.btn}><SatelliteIcon fontSize="small" /></IconButton>
        <Divider className={classes.divider}/>
        <IconButton size="small" className={classes.btn}><ExploreIcon fontSize="small" /></IconButton>
        <IconButton size="small" className={classes.btn}><AddIcon fontSize="small" /></IconButton>
        <IconButton size="small" className={classes.btn}><RemoveIcon fontSize="small" /></IconButton>
        <Divider className={classes.divider}/>
        <IconButton size="small" className={classes.btn}><GpsFixedIcon fontSize="small" /></IconButton>
      </ButtonGroup>
    </div>
  );
}