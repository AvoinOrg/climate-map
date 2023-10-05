'use client'

import React from 'react'
import { styled } from '@mui/material/styles'
import ButtonGroup from '@mui/material/ButtonGroup'
import ExploreIcon from '@mui/icons-material/ExploreOutlined'
import DoneIcon from '@mui/icons-material/Done'
import { Box, Button } from '@mui/material'

import { useMapStore } from '#/common/store'
import { useDrawMode } from '#/common/hooks/map/useDrawMode'
import {
  Terrain,
  Bullseye,
  Minus,
  Plus,
  Polygon,
  EditDocument,
} from '#/components/icons'
import { useIsDrawEnabled } from '#/common/hooks/map/useIsDrawEnabled'
import { useAllowedDrawModes } from '#/common/hooks/map/useAllowedDrawModes'

export const MapButtons = () => {
  const mapToggleTerrain = useMapStore((state) => state.mapToggleTerrain)
  const mapResetNorth = useMapStore((state) => state.mapResetNorth)
  const mapZoomIn = useMapStore((state) => state.mapZoomIn)
  const mapZoomOut = useMapStore((state) => state.mapZoomOut)
  const mapRelocate = useMapStore((state) => state.mapRelocate)
  const setDrawMode = useMapStore((state) => state.setDrawMode)
  const disableDraw = useMapStore((state) => state.disableDraw)
  const drawMode = useDrawMode()
  const isDrawEnabled = useIsDrawEnabled()
  const allowedDrawModes = useAllowedDrawModes()
  // const setIsDrawPolygon = useMapStore((state) => state.setIsDrawPolygon)

  return (
    <Box
      sx={(theme) => ({
        position: 'absolute',
        top: theme.spacing(1),
        right: theme.spacing(1),
        display: 'flex',
        flexDirection: 'row',
        zIndex:
          theme.zIndex.mobileStepper /* force this to be on top of the map */,
      })}
    >
      {isDrawEnabled && (
        <StyledButtonGroup
          orientation="horizontal"
          sx={{ height: '100%', mr: 1 }}
        >
          {drawMode != null && (
            <StyledButton onClick={() => disableDraw()} size="small">
              <DoneIcon />
            </StyledButton>
          )}
          {allowedDrawModes.includes('edit') && (
            <StyledButton
              onClick={() => setDrawMode('edit')}
              size="small"
              disabled={drawMode === 'edit'}
            >
              <EditDocument />
            </StyledButton>
          )}
          {allowedDrawModes.includes('polygon') && (
            <StyledButton onClick={() => setDrawMode('polygon')} size="small">
              <Polygon />
            </StyledButton>
          )}
        </StyledButtonGroup>
      )}
      <StyledButtonGroup orientation="horizontal" sx={{ height: '100%' }}>
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
      </StyledButtonGroup>
    </Box>
  )
}

// TODO: theme styling
const StyledButton = styled(Button)(({ theme }) => ({
  color: theme.palette.neutral.darker,
  backgroundColor: theme.palette.neutral.light,
  border: 'none',
  boxShadow: 'none',
  '&:hover': {
    backgroundColor: theme.palette.neutral.main,
    border: 'none',
  },
  '&.Mui-disabled': {
    border: 'none',
    color: theme.palette.neutral.main, // you can adjust the color if you want
  },
  flex: 1,
  width: '40px',
  height: '40px',
}))

const StyledButtonGroup = styled(ButtonGroup)(({ theme }) => ({
  height: '100%',
  boxShadow: '1px 1px 7px 0px #EEECEC',
}))
