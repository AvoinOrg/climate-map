'use client'

import React, { useLayoutEffect, useState } from 'react'
import { Box } from '@mui/material'

import { useUIStore } from '#/common/store'
import { MapPopup } from '../Map/MapPopup'
import { useMapStore } from '#/common/store'
import Drawer from './Drawer'
import PopupDrawer from './PopupDrawer'
import { SidebarHeader } from '#/components/Sidebar'

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const isMapPopupOpen = useUIStore((state) => state.isMapPopupOpen)
  const mode = useUIStore((state) => state.mode)
  const setIsMapPopupOpen = useUIStore((state) => state.setIsMapPopupOpen)
  const popupOpts = useMapStore((state) => state.popupOpts)
  const setSidebarHeaderElementSetter = useUIStore((state) => state.setSidebarHeaderElementSetter)

  // Initialize with empty header title to make the change of header smoother
  const [sidebarHeader, setSidebarHeader] = useState(<SidebarHeader title={''}></SidebarHeader>)

  useLayoutEffect(() => {
    setSidebarHeader(<SidebarHeader title={'avoin map'}></SidebarHeader>)
    setSidebarHeaderElementSetter(setSidebarHeader)
  }, [])

  return (
    <Box
      className="sidebar-container"
      sx={{
        zIndex: 1200,
        backgroundColor: 'white',
        minHeight: 0,
        width: 'max-content',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      {mode === 'side' && (
        <Box sx={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 }}>
          <Drawer open={isSidebarOpen}>
            {sidebarHeader}
            <Box
              className="sidebar-children-container"
              sx={{
                display: 'flex',
                flexDirection: 'column',
                direction: 'rtl',
                overflowY: 'scroll',
                '& > :not(style)': {
                  // apply to direct children that aren't style tags
                  direction: 'ltr',
                },
              }}
            >
              {children}
            </Box>
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
              <MapPopup popupOpts={popupOpts} />
            </Box>
          </PopupDrawer>
        </Box>
      )}
      {mode === 'full' && (
        <Box sx={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>{children}</Box>
      )}
    </Box>
  )
}

export default Sidebar
