import React from 'react'
import { List, ListItem, Switch, Container, createStyles, makeStyles, Theme } from '@material-ui/core';
import AccordionButton from './AccordionButton'

// Key used to toggle layer,
// Value used for i18n later
const items = {
  'ete': 'Especially Important Habitats',
  'ete-all-labels': 'METSO',
  'natura2000': 'Natura 2000',
}

interface BuildingsContentProps {
  item: any;
  checked: string;
  toggleLayer: Function;
}

const BuildingsContent = (props: BuildingsContentProps) => {
  const { checked, toggleLayer } = props
  return <List>
    {/* Special case - not in design, contains <p> */}
    <ListItem>
      <List>
        <ListItem>
          <Switch
            checked={checked == 'zonation6'}
            onClick={() => toggleLayer(`zonation6`)} /> Areas important to biodiversity
        </ListItem>
        <ListItem>
          <p>
            This layer comprises of the <a href="http://metatieto.ymparisto.fi:8080/geoportal/catalog/search/resource/details.page?uuid=%7B8E4EA3B2-A542-4C39-890C-DD7DED33AAE1%7D">Zonation 2018 data (forests of high biodiversity value)</a>.<br />
            The data shown corresponds to 10% of the most important areas for biodiversity in Finland.
          </p>
        </ListItem>
      </List>
    </ListItem>

    {
      Object.keys(items).map((item, i) =>
        <ListItem key={i}>
          <AccordionButton
            checked={checked}
            onChange={toggleLayer}
            items={items}
            item={item}
          />
        </ListItem>
      )
    }
  </List>
}

export default BuildingsContent
