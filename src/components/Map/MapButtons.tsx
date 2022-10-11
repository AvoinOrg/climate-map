import React, { useContext } from 'react'
import { useTheme, Theme } from '@mui/material/styles'

import makeStyles from '@mui/styles/makeStyles'
import createStyles from '@mui/styles/createStyles'

import ButtonGroup from '@mui/material/ButtonGroup'

import SatelliteIcon from '@mui/icons-material/Satellite'

import ExploreIcon from '@mui/icons-material/Explore'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'

import GpsFixedIcon from '@mui/icons-material/GpsFixed'

import { MapContext } from 'Components/Map'
import { Button } from '@mui/material'

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
export const GroupOrientation = () => {
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
