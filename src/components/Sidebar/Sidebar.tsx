import React from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';
import TextField from '@material-ui/core/TextField';

import Accordion from '../Accordion'

import drawerItems from './drawerItems'

import { ListItem } from '@material-ui/core';

import * as LayerGroups from '../../map/layer_groups'

interface SearchInputProps {
  onChange?: any;
}

export function SearchInput(props: SearchInputProps) {
  const { onChange } = props;

  const classes = makeStyles((theme: Theme) =>
    createStyles({
      search: {
      }
    }),
  )({})

  return (
    <TextField
      size="small"
      className={classes.search}
      onChange={(e) => onChange(e.target.value)}
      id="outlined-search"
      label="Search..."
      type="search"
      variant="outlined" />
  )
}

const drawerWidth = 340;

const filteredItems = (arr: { title: string }[], query: string) => {
  if (!query) {
    return arr
  }

  return arr.filter(
    (x) => x.title.toLowerCase().includes(query.toLowerCase())
  );

}

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      paddingLeft: 16
    },
    menuButton: {
      position: 'absolute',
      marginRight: theme.spacing(2),
    },
    hide: {
      display: 'none',
    },
    navlink: {
      color: 'black',
      textDecoration: 'none',
    },
    logo: {
      maxWidth: 200,
      float: 'left',
      marginLeft: -12,
      marginBottom: -24
    },
    search: {
      padding: 0
    },
    dropdownList: {
      marginTop: 90,
    },
    drawer: {
      width: drawerWidth,
      flexShrink: 0,
    },
    drawerPaper: {
      width: drawerWidth,
    },
    drawerItem: {
      marginBottom: theme.spacing(4),
      height: 47,
    },
    content: {
      flexGrow: 1,
      padding: theme.spacing(3),
    },
    toolbar: theme.mixins.toolbar,
  }),
);

function Sidebar(props: any) {
  const classes = useStyles({});
  const { sidebarOpen } = props

  const [checked, setChecked] = React.useState('')

  const toggleLayer = (layerName) => {
    if (checked == layerName) {
      LayerGroups.toggleGroup(layerName, false)
      setChecked('')
      return
    }

    LayerGroups.showLayer(layerName)
    setChecked(layerName)

  }

  return (
    <div className={"left-drawer"}>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
      >
        <List className={classes.dropdownList}>
          {
            drawerItems.map((item, i) =>
              <ListItem key={i}>
                <Accordion
                  checked={checked}
                  toggleLayer={toggleLayer}
                  drawerItem={true}
                  item={item} />
              </ListItem>
            )
          }
        </List>
      </Drawer>

    </div>
  );
}

// Later maybe react-router
const Link = (props: any) => <a
  className={props.className}
  {...props}
  href={props.to}>{props.children}
</a>


export default Sidebar

