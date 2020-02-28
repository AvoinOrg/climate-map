import React from 'react'
import { ExpansionPanel, ExpansionPanelSummary, Typography, ExpansionPanelDetails, List, ListItem, Container, createStyles, makeStyles, Theme, Switch } from '@material-ui/core';

import * as LayerGroups from '../../map/layer_groups'

// Key used to toggle layer,
// Value used for i18n later
const items = {
 'gfw_tree_plantations': 'Finland’s forests',
 'mangrove-forests': 'Mangrove forests',
 'mature-forests': 'Tropical peatland forests'
}



interface ForestContentProps {
  item: any;
  checked: string;
  toggleLayer: Function;
}

const ForestContent = (props: ForestContentProps) => {
  const { checked, toggleLayer } = props
  const onChange = (item) => {
    toggleLayer(item)
  }

  return <List>
    {
      Object.keys(items).map((item, i) =>
        <ListItem key={i}>
          <Switch
            checked={checked == item}
            onChange={() => onChange(item)} /> {items[item]}
        </ListItem>
      )
    }
  </List>
}

export default ForestContent
