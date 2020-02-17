import React from 'react'
import { List, ListItem, Switch } from '@material-ui/core';

import * as LayerGroups from '../../map/layer_groups'

// Key used to toggle layer,
// Value used for i18n later
const items = {
  'snow_cover_loss': 'Snow Cover Loss',
}

interface SnowCoverContentProps {
  item: any;
}

const SnowCoverContent = (props: SnowCoverContentProps) => {

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
    <ListItem>
      <p>
        This layer shows the global decrease in
        the amount of snow over time. Each area
        shown corresponds to an area that
        between 1980 and 1990 had at least 10
        days of snow on average. This average is
        contrasted with the average snowfall
        between 1996 and 2016.
      </p>
    </ListItem>
    <ListItem>
      <p>
        The data comes from FT-ESDR or <a href="#">Freeze/Thaw Earth System Data Record</a>.
      </p>
    </ListItem>
  </List>
}

export default SnowCoverContent
