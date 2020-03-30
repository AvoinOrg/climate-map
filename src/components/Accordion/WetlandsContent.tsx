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


const WetlandsContent = () => {
  const classes = useStyles({});
  return <div className={classes.root}>
    <AOExpansionPanel groupName={'bogs'} label={"Bogs and swamps (Finland)"} content={null} />
    <AOExpansionPanel groupName={'cifor-peatdepth'} label={"Tropical Peatlands"} content={null} />
    <AOExpansionPanel groupName={'cifor-wetlands'} label={"Tropical Wetlands"} content={null} />
  </div>
}

export default WetlandsContent
