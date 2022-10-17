import React, { useContext } from 'react'
import { Theme } from '@mui/material/styles'
import makeStyles from '@mui/styles/makeStyles'
import createStyles from '@mui/styles/createStyles'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import { ListItem } from '@mui/material'

import { Accordion } from 'Components/Sidebar/Accordion'
import { UserStateContext, UiStateContext } from 'Components/State'
import drawerItems, { privateDrawerItems } from './drawerItems'

const drawerWidth = 340

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    title: {
      paddingLeft: 16,
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
)

export const MainMenu = () => {
  const classes = useStyles({})

  const { isLoggedIn }: any = useContext(UserStateContext)

  return (
    <List className={classes.dropdownList}>
      {isLoggedIn &&
        privateDrawerItems.map((item, i) => (
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
  )
}

export const Sidebar = ({ children }) => {
  const classes = useStyles({})
  const { isSidebarOpen }: any = useContext(UiStateContext)

  return (
    <div className={'left-drawer'}>
      <Drawer className={classes.drawer} variant="persistent" anchor="left" open={isSidebarOpen}>
        {children}
      </Drawer>
    </div>
  )
}

export default Sidebar
