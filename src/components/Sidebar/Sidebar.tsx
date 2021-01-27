import React, { useContext } from "react";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import Drawer from "@material-ui/core/Drawer";
import List from "@material-ui/core/List";

import Accordion from "../Accordion";

import drawerItems, { userDrawerItems } from "./drawerItems";

import { ListItem } from "@material-ui/core";
import { StateContext } from "../State";
import { UserContext } from "../User";

const drawerWidth = 340;

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      paddingLeft: 16,
    },
    menuButton: {
      position: "absolute",
      marginRight: theme.spacing(2),
    },
    hide: {
      display: "none",
    },
    navlink: {
      color: "black",
      textDecoration: "none",
    },
    logo: {
      maxWidth: 200,
      float: "left",
      marginLeft: -12,
      marginBottom: -24,
    },
    search: {
      padding: 0,
    },
    dropdownList: {
      marginTop: 80,
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
    listItem: {
      fontFamily: theme.typography.fontFamily[0],
    },
  })
);

export function MainMenu() {
  const classes = useStyles({});

  const { isLoggedIn }: any = useContext(UserContext);

  return (
    <List className={classes.dropdownList}>
      {isLoggedIn &&
        userDrawerItems.map((item, i) => (
          <ListItem key={item.title} className={classes.listItem}>
            <Accordion drawerItem={true} item={item} />
          </ListItem>
        ))}
      {drawerItems.map((item, i) => (
        <ListItem key={item.title} className={classes.listItem}>
          <Accordion drawerItem={true} item={item} />
        </ListItem>
      ))}
    </List>
  );
}

function Sidebar({ children }) {
  const classes = useStyles({});
  const { isSidebarOpen }: any = useContext(StateContext);

  return (
    <div className={"left-drawer"}>
      <Drawer
        className={classes.drawer}
        variant="persistent"
        anchor="left"
        open={isSidebarOpen}
      >
        {children}
      </Drawer>
    </div>
  );
}

export default Sidebar;
