import React, { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Close from '@mui/icons-material/Close'

import { useUIStore } from '#/common/store'

export const LoginModal = () => {
  const isLoginModalOpen = useUIStore((state) => state.isLoginModalOpen)
  const setIsLoginModalOpen = useUIStore((state) => state.setIsLoginModalOpen)
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const sidebarWidth = useUIStore((state) => state.sidebarWidth)
  const [positionOffset, setPositionOffset] = useState(0)

  const handleCloseClick = () => {
    setIsLoginModalOpen(false)
  }

  useEffect(() => {
    if (isSidebarOpen && isLoginModalOpen) {
      setPositionOffset(sidebarWidth ? sidebarWidth / 2 : 0)
    }
  }, [isLoginModalOpen])

  return (
    <Box
      className="login-modal-container"
      sx={(theme) => ({
        zIndex: theme.zIndex.modal,
        position: 'fixed',
        overflow: 'auto',
        display: isLoginModalOpen ? 'flex' : 'none',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        margin: 0,
        [theme.breakpoints.up('md')]: {
          top: '50%',
          left: `calc(50% + ${positionOffset}px)`,
          transform: 'translate(-50%, -50%)',
          p: 0,
        },
        [theme.breakpoints.down('md')]: {
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        backgroundColor: theme.palette.neutral.lighter,
      })}
    >
      <IconButton
        sx={{
          position: 'sticky',
          top: '0',
          right: '0',
          alignSelf: 'flex-end',
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
        component="iframe"
        src="/login" // URL of the site you want to embed
        title="My iframe Example" // A title for the iframe
        sx={{
          border: 0,
          width: '100%',
          height: '100%', // Set the height to 100%
          overflow: 'hidden', // Do not allow the iframe to scroll
        }}
      />
    </Box>
  )
}
