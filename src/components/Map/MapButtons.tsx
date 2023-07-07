'use client'

import React from 'react'
import { styled } from '@mui/material/styles'
import ButtonGroup from '@mui/material/ButtonGroup'
import ExploreIcon from '@mui/icons-material/ExploreOutlined'
import { Button } from '@mui/material'

import { useMapStore } from '#/common/store'
import { Terrain, Bullseye, Minus, Plus } from '#/components/icons'

export const MapButtons = () => {
  const mapToggleTerrain = useMapStore((state) => state.mapToggleTerrain)
  const mapResetNorth = useMapStore((state) => state.mapResetNorth)
  const mapZoomIn = useMapStore((state) => state.mapZoomIn)
  const mapZoomOut = useMapStore((state) => state.mapZoomOut)
  const mapRelocate = useMapStore((state) => state.mapRelocate)
  // const setIsDrawPolygon = useMapStore((state) => state.setIsDrawPolygon)

  return (
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: theme.spacing(1),
        right: theme.spacing(1),
        zIndex: theme.zIndex.mobileStepper /* force this to be on top of the map */,
      })}
    >
      <ButtonGroup orientation="horizontal">
        <StyledButton onClick={mapToggleTerrain} size="small">
          <Terrain />
        </StyledButton>
        <StyledButton onClick={mapResetNorth} size="small">
          <ExploreIcon sx={{ fontSize: '27px' }} />
        </StyledButton>
        <StyledButton onClick={mapRelocate} size="small">
          <Bullseye />
        </StyledButton>
        <StyledButton onClick={mapZoomIn} size="small">
          <Plus />
        </StyledButton>
        <StyledButton onClick={mapZoomOut} size="small">
          <Minus />
        </StyledButton>
        {/* <StyledButton onClick={() => setIsDrawPolygon(true)} size="small">
          <EditIcon fontSize="small" />
        </StyledButton> */}
      </ButtonGroup>
    </Box>
  )
}

// TODO: theme styling
const StyledButton = styled(Button)(({ theme }) => ({
  color: theme.palette.neutral.darker,
  backgroundColor: theme.palette.neutral.light,
  border: 'none',
  '&:hover': {
    backgroundColor: theme.palette.neutral.main,
    border: 'none',
  },
}))

// TODO: theme styling
const Box = styled('div')(({ theme }) => ({}))
