import React from 'react'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'

import { AOAccordion } from '../AOAccordion'

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
    },
  })
)

const BuildingsContent = () => {
  const classes = useStyles({})

  return (
    <div className={classes.root}>
      <AOAccordion layerId={'building_energy_certs'} label={'Building energy certificates (Finland)'} content={null} />
      {/* <AOAccordion layerId={'fi_buildings'} label={'Buildings (Finland)'} content={null} /> */}
      <AOAccordion layerId={'helsinki_buildings'} label={'Buildings (Helsinki area)'} content={null} />
      <AOAccordion layerId={'hsy_solarpotential'} label={'Helsinki Area Solar Power Potential'} content={null} />
    </div>
  )
}

export default BuildingsContent
