import React from 'react'
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, List, ListItem, Container } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const item = {
  title: 'default'
}

interface ForestContentProps {
  item: any;
}

const ForestContent = (props: ForestContentProps) => {
  const { item } = props;
  return <List>
    <ListItem><FinlandForest /></ListItem>
    <ListItem><MangroveForest /></ListItem>
    <ListItem><TropicalForest /></ListItem>
  </List>
}

const FinlandForest = () => <ExpansionPanel>

  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>

    <Typography >Finland’s forests</Typography>
  </ExpansionPanelSummary>

  <ExpansionPanelDetails>
    under construction
</ExpansionPanelDetails>

</ExpansionPanel>

const MangroveForest = () => <ExpansionPanel>

  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
    <Typography >Mangrove forests</Typography>
  </ExpansionPanelSummary>

  <ExpansionPanelDetails>
    <Container>
      <p><a href="#">Global Mangrove Watch</a> data of global
mangrove forest cover from 2010.</p>
    </Container>
  </ExpansionPanelDetails>

</ExpansionPanel>

const TropicalForest = () => <ExpansionPanel>

  <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
    <Typography >Tropical peatland forests</Typography>
  </ExpansionPanelSummary>

  <ExpansionPanelDetails>
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



export default ForestContent
