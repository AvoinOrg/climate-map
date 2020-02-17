import React from 'react'
import { List, ListItem, Switch } from '@material-ui/core';

import * as LayerGroups from '../../map/layer_groups'

// Key used to toggle layer,
// Value used for i18n later
const items = {
  'bogs': 'Bogs and swamps',
  'cifor-peatdepth': 'Tropical Peat',
  'cifor-wetlands': 'Tropical Wetlands',
}

interface WetlandsContentProps {
  item: any;
}

const WetlandsContent = (props: WetlandsContentProps) => {

  const onChange = (item) => {
    LayerGroups.toggleGroup(`${item}`)
  }

  return <List>
    {
      Object.keys(items).map((item, i) =>
        <ListItem key={i}>
          <Switch onChange={() => onChange(item)} /> {items[item]}
        </ListItem>
      )
    }
  </List>
}

export default WetlandsContent
