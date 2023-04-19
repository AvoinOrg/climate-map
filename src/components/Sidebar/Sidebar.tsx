'use client'

import React, { useContext } from 'react'
import { Box } from '@mui/material'
import { UiStateContext } from '#/components/State'
import { MapPopup } from '../Map/MapPopup'
import SidebarHeader from './SidebarHeader'
import Drawer from './Drawer'
import PopupDrawer from './PopupDrawer'

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen, isMapPopupOpen, setIsMapPopupOpen }: any = useContext(UiStateContext)

  return (
    <Box
      sx={{
        position: 'absolute',
        zIndex: 1200,
        backgroundColor: 'white',
        width: 'auto',
        display: 'inline-block',
        height: '100%',
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        <Drawer open={isSidebarOpen}>
          <SidebarHeader />
          {children}
        </Drawer>

        <PopupDrawer open={isMapPopupOpen}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Box
              sx={{
                textDecoration: 'none',
                alignSelf: 'flex-end',
                margin: '10px 10px 0 0',
                '&:after': {
                  content: "'✖'",
                },
              }}
              onClick={() => setIsMapPopupOpen(false)}
            />
            <MapPopup />
          </Box>
        </PopupDrawer>
      </Box>
    </Box>
  )
}

export default Sidebar
