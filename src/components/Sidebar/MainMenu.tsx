'use client'

import React from 'react'
import List from '@mui/material/List'
import { ListItem } from '@mui/material'

import { Accordion } from '#/components/Sidebar/Accordion'
import drawerItems from '#/components/Sidebar/drawerItems'

export const MainMenu = () => {
  // const { isLoggedIn }: any = useContext(UserStateContext)

  return (
    <List sx={{ marginTop: '90px' }}>
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

export default MainMenu
