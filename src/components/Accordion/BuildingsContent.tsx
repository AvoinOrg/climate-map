import React from 'react'
import { List, ListItem, Switch } from '@material-ui/core';

// Key used to toggle layer,
// Value used for i18n later
const items = {
  'building-energy-certificates': 'Building energy certificates',
  'fi-buildings': 'Buildings (Finland)',
  'helsinki-buildings': 'Buildings (Helsinki area)',
  'hsy-solar-potential': 'Helsinki Area Solar Power Potential',
}

interface BuildingsContentProps {
  item: any;
  checked: string;
  toggleLayer: Function;
}

const BuildingsContent = (props: BuildingsContentProps) => {
  const { checked, toggleLayer } = props
  const onChange = (item) => {
    toggleLayer(`${item}`)
  }

  return <List>
    {
      Object.keys(items).map((item, i) =>
        <ListItem key={i}>
          <Switch checked={checked == item} onChange={() => onChange(item)} /> {items[item]}
        </ListItem>
      )
    }
  </List>
}

export default BuildingsContent
