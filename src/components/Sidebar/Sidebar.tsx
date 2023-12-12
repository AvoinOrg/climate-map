'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Box } from '@mui/material'

import { useUIStore } from '#/common/store'
import { MapPopup } from '../Map/MapPopup'
import { useMapStore } from '#/common/store'
import Drawer from './Drawer'
import PopupDrawer from './PopupDrawer'
import { SidebarHeader } from '#/components/Sidebar'
import { SCROLLBAR_WIDTH_REM } from '#/common/style/theme/constants'

export const Sidebar = ({ children }: { children: React.ReactNode }) => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const isMapPopupOpen = useUIStore((state) => state.isMapPopupOpen)
  const mode = useUIStore((state) => state.mode)
  const setIsMapPopupOpen = useUIStore((state) => state.setIsMapPopupOpen)
  const popupOpts = useMapStore((state) => state.popupOpts)
  const setSidebarHeaderElementSetter = useUIStore(
    (state) => state.setSidebarHeaderElementSetter
  )
  const setSidebarWidth = useUIStore((state) => state.setSidebarWidth)
  const sidebarWidth = useUIStore((state) => state.sidebarWidth)

  // Initialize with empty header title to make the change of header smoother
  const [sidebarHeader, setSidebarHeader] = useState(
    <SidebarHeader title={''}></SidebarHeader>
  )
  const sidebarRef = useRef()

  useLayoutEffect(() => {
    setSidebarHeader(<SidebarHeader title={'avoin map'}></SidebarHeader>)
    setSidebarHeaderElementSetter(setSidebarHeader)
  }, [])

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      setSidebarWidth(entries[0].contentRect.width)
    })

    if (sidebarRef.current) {
      resizeObserver.observe(sidebarRef.current)
    }

    return () => {
      if (sidebarRef.current) {
        resizeObserver.unobserve(sidebarRef.current)
      }
    }
  }, [])

  return (
    <Box
      ref={sidebarRef}
      className="sidebar-container"
      sx={{
        zIndex: 'drawer',
        backgroundColor: 'white',
        minHeight: 0,
        width: 'max-content',
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
      }}
    >
      {mode === 'side' && (
        <Box
          sx={{ display: 'flex', flexDirection: 'row', flex: 1, minHeight: 0 }}
        >
          <Drawer open={isSidebarOpen}>
            {sidebarHeader}
            <Box
              ref={sidebarRef}
              sx={{ overflow: 'auto', display: 'flex', flexGrow: 1 }}
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
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'row',
            width: '100%',
            height: '100%',
          }}
        >
          {children}
        </Box>
      )}
    </Box>
  )
}

export default Sidebar
