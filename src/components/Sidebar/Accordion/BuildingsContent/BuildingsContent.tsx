import React from 'react'
import { Box } from '@mui/material'

import { AOAccordion } from '../AOAccordion'

const BuildingsContent = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <AOAccordion layerId={'building_energy_certs'} label={'Building energy certificates (Finland)'} content={null} />
      {/* <AOAccordion layerId={'fi_buildings'} label={'Buildings (Finland)'} content={null} /> */}
      <AOAccordion layerId={'helsinki_buildings'} label={'Buildings (Helsinki area)'} content={null} />
      <AOAccordion layerId={'hsy_solarpotential'} label={'Helsinki Area Solar Power Potential'} content={null} />
    </Box>
  )
}

export default BuildingsContent
