import React from 'react';
import { makeStyles, Theme, createStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import List from '@material-ui/core/List';

import Accordion from '../Accordion'

import drawerItems from './drawerItems'

import { ListItem } from '@material-ui/core';
import { useObservable } from 'micro-observables';
import * as SidebarState from './SidebarState'

const drawerWidth = 340;

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
      marginTop: 60,
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

export function MainMenu() {
  const classes = useStyles({});
  return <List className={classes.dropdownList}>
  {
    drawerItems.map((item, i) =>
      <ListItem key={i}>
        <Accordion
          drawerItem={true}
          item={item} />
      </ListItem>
    )
  }
  </List>
}

function Sidebar({ children }) {
  const classes = useStyles({});
  const sidebarOpen = useObservable(SidebarState.isOpenObservable)

  return (
    <div className={"left-drawer"}>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={sidebarOpen}
      >
        {children}
      </Drawer>

    </div>
  );
}

export default Sidebar
