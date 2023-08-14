'use client'

import React from 'react'
import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'

import { useUIStore } from '#/common/store'
import UserButtons from './UserButtons'

export const NavBar = () => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)

  return (
    <>
      {isSidebarOpen && (
        <Box
          className="navbar-container"
          sx={(theme) => ({
            zIndex: theme.zIndex.appBar,
            width: '100%',
            minWidth: '200px',
            height: '100px',
            backgroundColor: theme.palette.primary.dark,
            margin: 'auto 0 0 0',
            bottom: 0,
            border: 1,
            borderColor: theme.palette.primary.dark,
            display: 'flex',
            flexDirection: 'row',
            p: 4,
          })}
        >
          <Box sx={{ display: 'flex', flexDirection: 'row' }}>
            <UserButtons></UserButtons>
          </Box>
        </Box>
      )}
    </>
  )
}

const ImageWrapper = styled('div')({
  padding: '8px 0 0 0',
})
