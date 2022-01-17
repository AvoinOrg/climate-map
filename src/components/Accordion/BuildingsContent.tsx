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


const BuildingsContent = () => {
  const classes = useStyles({});
  return <div className={classes.root}>
    <AOAccordion groupName={'building-energy-certificates'} label={"Building energy certificates (Finland)"} content={null} />
    <AOAccordion groupName={'fi-buildings'} label={"Buildings (Finland)"} content={null} />
    <AOAccordion groupName={'helsinki-buildings'} label={"Buildings (Helsinki area)"} content={null} />
    <AOAccordion groupName={'hsy-solar-potential'} label={"Helsinki Area Solar Power Potential"} content={null} />
  </div>
}

export default BuildingsContent
