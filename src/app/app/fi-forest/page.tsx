'use client'

import React, { useContext, useState, useEffect } from 'react'
import axios from 'axios'
import { Button, Box } from '@mui/material'

import { MapContext } from '#/components/Map'

const CarbonMap = () => {

  useEffect(() => {
    toggleLayerGroup("fi_forests")
  }, [])

  const { activeLayerGroups, toggleLayerGroup } = React.useContext(MapContext)

  return <Box sx={{ margin: '100px', display: 'flex', flexDirection: 'column' }}></Box>
}

export default CarbonMap
