'use client'

import React, { useContext } from 'react'
import Drawer from '@mui/material/Drawer'
import { Box } from '@mui/material'

// import { UserStateContext, UiStateContext } from '#/components/State'
import { UiStateContext } from '#/components/State'
// import drawerItems, { privateDrawerItems } from './drawerItems'
import { MapPopup } from '../Map/MapPopup'

const DRAWER_WIDTH = 340
const TRANSITION_DURATION = 350

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarOpen, isMapPopupOpen, setIsMapPopupOpen }: any = useContext(UiStateContext)

  return (
    <Box
    // sx={{
    //   display: 'flex',
    //   flexDirection: 'row',
    //   position: 'absolute',
    //   zIndex: 1000,
    //   top: 0,
    //   left: 0,
    //   bottom: 0,
    //   padding: '200px',
    //   backgroundColor: 'blue',
    // }}
    >
      <Drawer
        sx={{}}
        variant="persistent"
        anchor="left"
        key="drawer1"
        open={isSidebarOpen}
        PaperProps={{
          sx: {
            width: DRAWER_WIDTH,
            transition: `all ${TRANSITION_DURATION}ms cubic-bezier(0, 0, 0.2, 1) 0ms !important`,
          },
        }}
        transitionDuration={TRANSITION_DURATION}
        // PaperProps={{
        //   sx: {
        //     transition: `all ${TRANSITION_DURATION}ms cubic-bezier(1, 1, 1, 1) 0ms !important`,
        //   },
        // }}
      >
        {children}
      </Drawer>
      <Drawer
        sx={{ zIndex: 100 }}
        variant="persistent"
        anchor="left"
        key="drawer2"
        open={isMapPopupOpen}
        transitionDuration={TRANSITION_DURATION}
        PaperProps={{
          sx: {
            margin: isSidebarOpen ? `64px 0 0 ${DRAWER_WIDTH}px` : '64px 0 0 0',
            transition: `all ${TRANSITION_DURATION}ms cubic-bezier(0, 0, 0.2, 1) 0ms !important`,
            border: '0',
            borderRight: '0',
            height: 'auto',
            zIndex: 100,
          },
        }}
      >
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
      </Drawer>
    </Box>
  )
}

export default Sidebar
