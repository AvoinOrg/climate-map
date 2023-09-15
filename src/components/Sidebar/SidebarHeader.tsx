import { Box, Typography } from '@mui/material'
import React from 'react'
import SidebarToggleButton from './SidebarToggleButton'

interface Props {
  children?: React.ReactNode
  title: string
  sx?: any
}

const SidebarHeader = ({ children, title, sx }: Props) => {
  return (
    <Box
      sx={{
        p: 0,
        pr: 3,
        pb: 3,
        backgroundColor: 'neutral.light',
        display: 'flex',
        border: 1,
        borderColor: 'primary.dark',
        flexDirection: 'column',
        ...sx
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', flexGrow: 1 }}>
        <SidebarToggleButton />
        <Typography sx={{ margin: '20px 0 0 0', width: '100%', textAlign: 'end' }} variant="h2">
          {title}
        </Typography>
      </Box>
      <Box sx={{ ml: 3 }}>{children}</Box>
    </Box>
  )
}

export default SidebarHeader
