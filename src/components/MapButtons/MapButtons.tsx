import React, { useContext } from 'react'
import { makeStyles, useTheme, Theme, createStyles } from '@material-ui/core/styles'

import ButtonGroup from '@material-ui/core/ButtonGroup'

import SatelliteIcon from '@material-ui/icons/Satellite'

import ExploreIcon from '@material-ui/icons/Explore'
import AddIcon from '@material-ui/icons/Add'
import RemoveIcon from '@material-ui/icons/Remove'

import GpsFixedIcon from '@material-ui/icons/GpsFixed'

import MapContext from 'Components/Map/Map'
import { Button } from '@material-ui/core'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    iconGroup: {
      position: 'absolute',
      top: theme.spacing(12),
      right: theme.spacing(2),
      zIndex: theme.zIndex.mobileStepper /* force this to be on top of the map */,
    },
    btn: {
      color: '#333333',
      backgroundColor: 'white',
      '&:hover': {
        backgroundColor: '#eeeeee',
      },
    },
    divider: {
      marginTop: theme.spacing(1),
      marginBottom: theme.spacing(1),
    },
  })
)
export default function GroupOrientation() {
  const theme = useTheme()
  const classes = useStyles(theme)
  const { mapToggleTerrain, mapResetNorth, mapZoomIn, mapZoomOut, mapRelocate } = React.useContext(MapContext)

  return (
    <div className={classes.iconGroup}>
      <ButtonGroup orientation="vertical">
        <Button onClick={mapToggleTerrain} size="small" className={classes.btn}>
          <SatelliteIcon fontSize="small" />
        </Button>
        <Button onClick={mapResetNorth} size="small" className={classes.btn}>
          <ExploreIcon fontSize="small" />
        </Button>
        <Button onClick={mapZoomIn} size="small" className={classes.btn}>
          <AddIcon fontSize="small" />
        </Button>
        <Button onClick={mapZoomOut} size="small" className={classes.btn}>
          <RemoveIcon fontSize="small" />
        </Button>
        <Button onClick={mapRelocate} size="small" className={classes.btn}>
          <GpsFixedIcon fontSize="small" />
        </Button>
      </ButtonGroup>
    </div>
  )
}
