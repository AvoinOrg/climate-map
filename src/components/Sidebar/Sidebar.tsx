'use client'

import React, { useContext } from 'react'
import { Box } from '@mui/material'

import { useUIStore } from '#/components/State'
import { MapPopup } from '../Map/MapPopup'
import Drawer from './Drawer'
import PopupDrawer from './PopupDrawer'

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const isMapPopupOpen = useUIStore((state) => state.isMapPopupOpen)
  const setIsMapPopupOpen = useUIStore((state) => state.setIsMapPopupOpen)

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
        <Drawer open={isSidebarOpen}>{children}</Drawer>

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
