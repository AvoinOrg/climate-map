import React from 'react'
import { Box } from '@mui/material'

import { AOAccordion } from '../AOAccordion'

const BuildingsContent = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <AOAccordion layerGroupId={'building_energy_certs'} label={'Building energy certificates (Finland)'} content={null} />
      {/* <AOAccordion layerGroupId={'fi_buildings'} label={'Buildings (Finland)'} content={null} /> */}
      <AOAccordion layerGroupId={'helsinki_buildings'} label={'Buildings (Helsinki area)'} content={null} />
      {/* <AOAccordion layerGroupId={'EEhelsinki_buildings'} label={'Energy Efficiency of Buildings (Helsinki area)'} content={null} /> */}
      <AOAccordion layerGroupId={'hsy_solarpotential'} label={'Helsinki Area Solar Power Potential'} content={null} />
    </Box>
  )
}

export default BuildingsContent
