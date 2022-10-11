import React from 'react'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { AOAccordion } from 'Components/Accordion'

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
      <AOAccordion groupName={'bogs'} label={'Bogs and swamps (Finland)'} content={null} />
      <AOAccordion groupName={'cifor-peatdepth'} label={'Tropical Peatlands'} content={null} />
      <AOAccordion groupName={'cifor-wetlands'} label={'Tropical Wetlands'} content={null} />
    </div>
  )
}

export default WetlandsContent
