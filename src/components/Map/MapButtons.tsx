'use client'

import React, { useContext } from 'react'
import { styled } from '@mui/material/styles'
import ButtonGroup from '@mui/material/ButtonGroup'
import SatelliteIcon from '@mui/icons-material/Satellite'
import ExploreIcon from '@mui/icons-material/Explore'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import GpsFixedIcon from '@mui/icons-material/GpsFixed'
import EditIcon from '@mui/icons-material/Edit';

import { MapContext } from '#/components/Map'
import { Button } from '@mui/material'

export const GroupOrientation = () => {
  const { mapToggleTerrain, mapResetNorth, mapZoomIn, mapZoomOut, mapRelocate, setIsDrawPolygon } =
    useContext(MapContext)

  return (
    <IconGroup>
      <ButtonGroup orientation="vertical">
        <StyledButton onClick={mapToggleTerrain} size="small">
          <SatelliteIcon fontSize="small" />
        </StyledButton>
        <StyledButton onClick={mapResetNorth} size="small">
          <ExploreIcon fontSize="small" />
        </StyledButton>
        <StyledButton onClick={mapZoomIn} size="small">
          <AddIcon fontSize="small" />
        </StyledButton>
        <StyledButton onClick={mapZoomOut} size="small">
          <RemoveIcon fontSize="small" />
        </StyledButton>
        <StyledButton onClick={mapRelocate} size="small">
          <GpsFixedIcon fontSize="small" />
        </StyledButton>
        <StyledButton onClick={() => setIsDrawPolygon(true)} size="small">
          <EditIcon fontSize="small" />
        </StyledButton>
      </ButtonGroup>
    </IconGroup>
  )
}

// TODO: theme styling
const StyledButton = styled(Button)(({ theme }) => ({
  color: '#333333',
  backgroundColor: 'white',
  '&:hover': {
    backgroundColor: '#eeeeee',
  },
}))

// TODO: theme styling
const IconGroup = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(12),
  right: theme.spacing(2),
  zIndex: theme.zIndex.mobileStepper /* force this to be on top of the map */,
}))
