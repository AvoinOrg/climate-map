import React from 'react'
import { CircularProgress, SxProps, Theme } from '@mui/material'

export const LoadingSpinner = ({ sx }: { sx?: SxProps<Theme> }) => {
  return <CircularProgress sx={[...(Array.isArray(sx) ? sx : [sx])]} />
}
