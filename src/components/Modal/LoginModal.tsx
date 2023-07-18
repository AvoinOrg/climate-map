import React from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Close from '@mui/icons-material/Close'

import { useUIStore } from '#/common/store'

export const LoginModal = () => {
  const isLoginModalOpen = useUIStore((state) => state.isLoginModalOpen)
  const setIsLoginModalOpen = useUIStore((state) => state.setIsLoginModalOpen)

  const handleCloseClick = () => {
    setIsLoginModalOpen(false)
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '64px 10px 20px 10px',
        zIndex: (theme) => theme.zIndex.modal,
        backgroundColor: 'white',
        overflowY: 'scroll',
        display: isLoginModalOpen ? 'flex' : 'none',
      }}
    >
      <IconButton
        sx={{
          position: 'absolute',
          top: '94px',
          right: '30px',
          zIndex: (theme) => theme.zIndex.modal + 1,
        }}
        aria-label="display more actions"
        aria-controls="actions-menu"
        aria-haspopup="true"
        onClick={handleCloseClick}
        color="inherit"
        size="large"
      >
        <Close sx={{ fontSize: '1.5rem' }} />
      </IconButton>

      <Box
        sx={{
          position: 'fixed',
          top: 64,
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: 'center',
          flexDirection: 'column',
          backgroundColor: 'white',
          overflow: 'auto',
          padding: '0 0 128px 0',
          display: 'flex',
        }}
      ></Box>
    </Box>
  )
}
