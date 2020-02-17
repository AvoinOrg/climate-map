import React from 'react'
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, List, ListItem, Container, createStyles, makeStyles, Theme, Switch } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import * as LayerGroups from '../../map/layer_groups'

const item = {
  title: 'default'
}

interface ForestContentProps {
  item: any;
}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    listItem: {
      width: '100%',
      padding: 2,
      firstChild: {
        marginTop: 2
      },
      lastChild: {
        padding: 0
      }
    },
    expansionPanel: {
      width: '100%'
    },
    paddingOne: {
      padding: 1
    },
    labelList: {
      paddingLeft: 12
    },
    label: {
      display: 'inline-block',
      padding: '5px 8px',
      border: '1px solid black',
    }

  }),
);

const ForestContent = (props: ForestContentProps) => {
  const classes = useStyles({});
  return <List className={classes.paddingOne}>
    <ListItem className={classes.listItem}>
      <FinlandForest />
    </ListItem>
    <ListItem className={classes.listItem}>
      <MangroveForest />
    </ListItem>
    <ListItem className={classes.listItem}>
      <TropicalForest />
    </ListItem>
  </List>
}

const FinlandForestContent = () => {
  const classes = useStyles({});

  return <Container>
    <Switch onChange={() => LayerGroups.toggleGroup('arvometsa')} /> Forestry CO2e balance
    <ul className={classes.labelList}>
      <li className={classes.label} style={{ 'background': '#FFEC42' }}>-5</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 62.5%, 1)' }}>0</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 50%, 1)' }}>5</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 32.5%, 1)' }}>10</li>
      <li className={classes.label} style={{ 'background': 'hsla(159, 100%, 25%, 1)' }}>15+</li>
      <li style={{ marginBottom: 3, listStyle: 'none' }}>tons per ha/year</li>
    </ul>
  </Container>
}
const FinlandForest = () => {
  const classes = useStyles({});
  return (
    <ExpansionPanel className={classes.expansionPanel}>

      <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>

        <Typography >Finland’s forests</Typography>
      </ExpansionPanelSummary>

      <ExpansionPanelDetails className={classes.paddingOne}>
        <FinlandForestContent />
      </ExpansionPanelDetails>

    </ExpansionPanel>
  )
}

const MangroveForest = () => {
  const classes = useStyles({});
  return (
    <ExpansionPanel className={classes.expansionPanel}>

      <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
        <Typography >Mangrove forests</Typography>
      </ExpansionPanelSummary>

      <ExpansionPanelDetails className={classes.paddingOne}>
        <Container>
          <p><a href="#">Global Mangrove Watch</a> data of global mangrove forest cover from 2010.</p>
        </Container>
      </ExpansionPanelDetails>

    </ExpansionPanel>
  )
}

const TropicalForest = () => {
  const classes = useStyles({});
  return (
    <ExpansionPanel className={classes.expansionPanel}>

      <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
        <Typography >Tropical peatland forests</Typography>
      </ExpansionPanelSummary>

      <ExpansionPanelDetails className={classes.paddingOne}>
        <Container>  <p>
          <a href="#">Global Forest Watch</a> data of tree
plantations from year x combined with
<a href="#">Cifor data</a> of global wetlands from year
x.

</p>
          <p>
            Green color indicates the forest
            plantations that are on mineral soil
            and brown color indicates forest
            plantations that are on peatland soil.
</p>
          <p>
            Click on a forest plantation to view more
            information and estimated emission
            reduction potentials of peatland forest
            plantations when the groundwater level
            is lifted by 40cm.
</p>
        </Container>

      </ExpansionPanelDetails>

    </ExpansionPanel>
  )
}


export default ForestContent
