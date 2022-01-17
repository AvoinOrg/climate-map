import React from 'react'
import { createStyles, makeStyles } from '@material-ui/core';
import { AOAccordion } from './AOAccordion';

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
    },
  }),
);


const WetlandsContent = () => {
  const classes = useStyles({});
  return <div className={classes.root}>
    <AOAccordion groupName={'bogs'} label={"Bogs and swamps (Finland)"} content={null} />
    <AOAccordion groupName={'cifor-peatdepth'} label={"Tropical Peatlands"} content={null} />
    <AOAccordion groupName={'cifor-wetlands'} label={"Tropical Wetlands"} content={null} />
  </div>
}

export default WetlandsContent
