'use client'

import React, { useContext } from 'react'
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import { ListItem } from '@mui/material'

import { Accordion } from '#/components/Sidebar/Accordion'
// import { UserStateContext, UiStateContext } from '#/components/State'
import { UiStateContext } from '#/components/State'
// import drawerItems, { privateDrawerItems } from './drawerItems'
import drawerItems from '#/components/Sidebar/drawerItems'

const drawerWidth = 340

export const MainMenu = () => {
  // const { isLoggedIn }: any = useContext(UserStateContext)

  return (
    <List sx={{ marginTop: 80 }}>
      {/* {isLoggedIn &&
        privateDrawerItems.map((item, i) => (
          <ListItem key={item.title} sx={{fontFamily: theme.typography.fontFamily[0]}}>
            <Accordion drawerItem={true} item={item} />
          </ListItem>
        ))} */}
      {drawerItems.map((item, i) => (
        <ListItem key={item.title} sx={{ typography: 'body1' }}>
          <Accordion isDrawerItem={true} item={item} />
        </ListItem>
      ))}
    </List>
  )
}

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen }: any = useContext(UiStateContext)

  return (
    <div>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
        }}
        variant="persistent"
        anchor="left"
        open={isSidebarOpen}
      >
        {children}
      </Drawer>
    </div>
  )
}

export default Sidebar
