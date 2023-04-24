import { Box, Typography } from '@mui/material'
import React from 'react'
import SidebarToggleButton from './SidebarToggleButton'

interface Props {
  children?: React.ReactNode
  title: string
}

const SidebarHeader = ({ children, title }: Props) => {
  return (
    <Box sx={{ padding: '3px 24px 24px 24px', backgroundColor: 'tertiary.main' }}>
      <Box sx={{ display: 'flex', flexDirection: 'row' }}>
        <SidebarToggleButton sx={{ margin: '24px 0 0 0' }}></SidebarToggleButton>
        <Typography sx={{ margin: '20px 0 0 0', width: '100%', textAlign: 'end' }} variant="h2">
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  )
}

export default SidebarHeader
