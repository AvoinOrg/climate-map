'use client'

import React, { useEffect, useState } from 'react'
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

  const [sidebarHeader, setSidebarHeader] = useState(<SidebarHeader title={'avoin map'}></SidebarHeader>)

  useEffect(() => {
    setSidebarHeaderElementSetter(setSidebarHeader)
  }, [])

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
      {mode === 'side' && (
        <Box sx={{ display: 'flex', flexDirection: 'row' }}>
          <Drawer open={isSidebarOpen}>
            {sidebarHeader}
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
