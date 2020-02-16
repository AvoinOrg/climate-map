import React from 'react'
import { List, ListItem, Switch } from '@material-ui/core';

import * as LayerGroups from '../../map/layer_groups'

// Key used to toggle layer,
// Value used for i18n later
const items = {
'building-energy-certificates': 'Building energy certificates',
'fi-buildings':'Buildings (Finland)',
'helsinki-buildings':'Buildings (Helsinki area)',
'hsy-solar-potential':'Helsinki Area Solar Power Potential',
}

interface BuildingsContentProps {
  item: any;
}

const BuildingsContent = (props: BuildingsContentProps) => {

  const onChange = (item) => {
    LayerGroups.toggleGroup(`${item}`)
  }

  return <List>
    {
      Object.keys(items).map((item, i) =>
      <ListItem key={i}>
        {items[item]} <Switch onChange={() => onChange(item)}
        />
      </ListItem>
      )
    }
  </List>
}

export default BuildingsContent
