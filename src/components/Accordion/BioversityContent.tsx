import React from 'react'
import { List, ListItem, Switch, Container } from '@material-ui/core';

import * as LayerGroups from '../../map/layer_groups'

// Key used to toggle layer,
// Value used for i18n later
const items = {
  'ete': 'Especially Important Habitats',
  'ete-all-labels': 'METSO',
  'natura2000': 'Natura 2000',
}

interface BuildingsContentProps {
  item: any;
}

const BuildingsContent = (props: BuildingsContentProps) => {

  const onChange = (item) => {
    LayerGroups.toggleGroup(`${item}`)
  }

  return <List>
    {/* Special case - not in design, contains <p> */}
    <ListItem>
      <Container>
      <List>
        <ListItem>
          Areas important to biodiversity <Switch onClick={() => LayerGroups.toggleGroup(`zonation6`)} /> <br />
        </ListItem>
        <ListItem>
          This layer comprises of the <a href="http://metatieto.ymparisto.fi:8080/geoportal/catalog/search/resource/details.page?uuid=%7B8E4EA3B2-A542-4C39-890C-DD7DED33AAE1%7D">Zonation 2018 data (forests of high biodiversity value)</a>.
        </ListItem>
        <ListItem>
        The data shown corresponds to 10% of the most important areas for biodiversity in Finland.
        </ListItem>
      </List>
      </Container>
    </ListItem>

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
