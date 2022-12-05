import React from 'react'
import { Box } from '@mui/material'
import { CircularProgress } from '@mui/material'

export const LoadingModal = () => {
  return (
    <Box
      sx={(theme) => ({
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        padding: '64px 10px 200px 10px',
        zIndex: theme.zIndex.modal + 1,
        backgroundColor: 'white',
        overflowY: 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      })}
    >
      <CircularProgress color="secondary" size={200} />
    </Box>
  )
}
