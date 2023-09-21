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
      className="sidebar-header"
      sx={{
        backgroundColor: 'neutral.light',
        display: 'flex',
        border: 1,
        borderColor: 'primary.dark',
        flexDirection: 'column',
        ...sx,
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          flexGrow: 1,
          pr: 5,
        }}
      >
        <SidebarToggleButton />
        <Typography
          sx={{ width: '100%', textAlign: 'end', mt: 4 }}
          variant="h2"
        >
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          pl: 5,
          pb: 4,
          pr: 5,
          overflow: 'hidden',
          maxWidth: sx?.width ? sx.width : '100%',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export default SidebarHeader
