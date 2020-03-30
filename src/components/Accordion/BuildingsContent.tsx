import React from 'react'
import { createStyles, makeStyles } from '@material-ui/core';
import { AOExpansionPanel } from './AOExpansionPanel';

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
    <AOExpansionPanel groupName={'building-energy-certificates'} label={"Building energy certificates (Finland)"} content={null} />
    <AOExpansionPanel groupName={'fi-buildings'} label={"Buildings (Finland)"} content={null} />
    <AOExpansionPanel groupName={'helsinki-buildings'} label={"Buildings (Helsinki area)"} content={null} />
    <AOExpansionPanel groupName={'hsy-solar-potential'} label={"Helsinki Area Solar Power Potential"} content={null} />
  </div>
}

export default BuildingsContent
