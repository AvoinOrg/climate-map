import React from 'react'
import { ExpansionPanel, ExpansionPanelSummary, ExpansionPanelDetails, createStyles, makeStyles, Theme, Checkbox } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import * as LayerGroups from '../../map/layer_groups'
import { useObservable } from "micro-observables";


const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
    },
    heading: {
      fontSize: theme.typography.pxToRem(15),
      fontWeight: theme.typography.fontWeightRegular,
    },
    labelList: {
      paddingLeft: 12
    },
    label: {
      display: 'inline-block',
      padding: '5px 8px',
      border: '1px solid black',
    },
    content: {
      margin: 'unset',
    }
    // MuiExpansionPanelSummary-content.Mui-expanded
    // activeCard: {
    //   backgroundColor: 'rgba(0,100,100,0.1)',
    // },
  }),
);


const AOExpansionPanel = ({groupName, label, content}: any) => {
  const layerGroups = useObservable(LayerGroups.layerGroupService.layerGroups);
  const groupEnabled = layerGroups.filter(x => x.name === groupName).length > 0
  const classes = useStyles({});

  return <ExpansionPanel>
    <ExpansionPanelSummary className={classes.content} expandIcon={<ExpandMoreIcon />}>
      <FormControlLabel
        onClick={event => { event.stopPropagation() }}
        onChange={event => LayerGroups.layerGroupService.setGroupState(groupName, (event.target as HTMLInputElement).checked)}
        onFocus={event => event.stopPropagation()}
        control={<Checkbox />}
        label={label}
        checked={groupEnabled}
      />
      {/* <Typography className={classes.heading}>{label}</Typography> */}
    </ExpansionPanelSummary>

    <ExpansionPanelDetails>{content}</ExpansionPanelDetails>

  </ExpansionPanel>
}


const FinlandForestContent = () => {
  const classes = useStyles({});

  return <div>
    <ul className={classes.labelList}>
      <li className={classes.label} style={{ 'background': '#FFEC42' }}>-5</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 62.5%, 1)' }}>0</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 50%, 1)' }}>5</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 32.5%, 1)' }}>10</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 25%, 1)' }}>15+</li>
      <li style={{ marginBottom: 3, listStyle: 'none' }}>tons per ha/year</li>
    </ul>
  </div>
}



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
    <AOExpansionPanel groupName={'arvometsa'} label={"Finland's Forests"} content={<FinlandForestContent/>} />
    <AOExpansionPanel groupName={'mangrove-forests'} label={"Mangrove forests"} content={<MangroveForestContent/>} />
    <AOExpansionPanel groupName={'gfw_tree_plantations'} label={"Tree plantations"} content={<TropicalForestContent/>} />
  </div>
}


export default ForestContent
