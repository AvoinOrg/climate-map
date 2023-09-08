import React from 'react'
import type { SxProps, Theme } from '@mui/system'
import MuiLink from '@mui/material/Link'
import NextLink from 'next/link'

type Props = {
  href: string
  children?: React.ReactNode
  sx?: SxProps<Theme>
}

const Link = ({ href, children, sx }: Props) => {
  return (
    <MuiLink
      href={href}
      sx={{
        display: 'flex',
        color: 'inherit',
        textDecoration: 'none',
        ...sx,
      }}
      component={NextLink}
    >
      {children}
    </MuiLink>
  )
}

export default Link
