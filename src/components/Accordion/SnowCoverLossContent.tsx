import React from 'react'
import { Container } from '@material-ui/core';
import { LayerToggleControl } from './AOExpansionPanel';


const SnowCoverContent = () => {
  return <Container>
    <LayerToggleControl groupName='snow_cover_loss' label='Show on map' />
    <p>
      This layer shows the global decrease in
      the amount of snow over time. Each area
      shown corresponds to an area that
      between 1980 and 1990 had at least 10
      days of snow on average. This average is
      contrasted with the average snowfall
      between 1996 and 2016.
      </p>
    <p>
      The data comes from FT-ESDR or
        {} <a href="http://www.ntsg.umt.edu/freeze-thaw/">Freeze/Thaw Earth System Data Record</a>.
      </p>
  </Container>
}

export default SnowCoverContent
