import React from 'react'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { AOAccordion } from '#/components/Sidebar/Accordion'

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
    },
  })
)

const WetlandsContent = () => {
  const classes = useStyles({})
  return (
    <div className={classes.root}>
      <AOAccordion layerId={'fi_bogs'} label={'Bogs and swamps (Finland)'} content={null} />
      <AOAccordion layerId={'cifor_peatdepth'} label={'Tropical Peatlands'} content={null} />
      <AOAccordion layerId={'cifor_wetlands'} label={'Tropical Wetlands'} content={null} />
    </div>
  )
}

export default WetlandsContent
