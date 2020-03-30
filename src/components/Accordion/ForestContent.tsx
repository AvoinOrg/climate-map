import React from 'react'
import { createStyles, makeStyles } from '@material-ui/core';
import { AOExpansionPanelLink, AOExpansionPanel } from './AOExpansionPanel';


const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
    },
  }),
);


const MangroveForestContent = () =>
  <div>
    <p>
      This layer shows mangrove forests monitored by
      {} <a href="https://www.globalmangrovewatch.org/about/">the Global Mangrove Watch</a>.
    </p>
    <p>
      The data shown here is from 2010.
    </p>
  </div>


const TropicalForestContent = () =>
  <div>
    <p>
      <a href="https://www.globalforestwatch.org/">the Global Forest Watch</a>
      tree plantations data from combined with
      {} <a href="https://www.cifor.org/">CIFOR data</a> of global wetlands.
    </p>
    <p>
      Green areas area forest plantations that are on mineral soil
      and brown areas those in peatlands.
    </p>
    <p>
      Click on a forest plantation to view more information and estimated emission
      reduction potentials of peatland forest plantations when the groundwater level
      is lifted by 40 cm.
    </p>
  </div>


const ForestContent = () => {
  const classes = useStyles({});
  return <div className={classes.root}>
    <AOExpansionPanelLink href='/layers/fi-forest' label={"Finland's Forests"} />
    <AOExpansionPanel groupName={'mangrove-forests'} label={"Mangrove forests"} content={<MangroveForestContent/>} />
    <AOExpansionPanel groupName={'gfw_tree_plantations'} label={"Tree plantations"} content={<TropicalForestContent/>} />
  </div>
}


export default ForestContent
