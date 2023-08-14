import React from 'react'
import { Box } from '@mui/material'
import { AOAccordion } from '#/components/Sidebar/Accordion'

const WetlandsContent = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <AOAccordion layerGroupId={'fi_bogs'} label={'Bogs and swamps (Finland)'} content={null} />
      <AOAccordion layerGroupId={'cifor_peatdepth'} label={'Tropical Peatlands'} content={null} />
      <AOAccordion layerGroupId={'cifor_wetlands'} label={'Tropical Wetlands'} content={null} />
    </Box>
  )
}

export default WetlandsContent
