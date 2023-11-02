import React from 'react'
import { LinkProps as MuiLinkProps, Link as MuiLink } from '@mui/material'
import NextLink, { LinkProps as NextLinkProps } from 'next/link'

type LinkProps = MuiLinkProps & NextLinkProps

const Link = ({ sx, children, ...props }: LinkProps) => {
  return (
    <MuiLink
      component={NextLink}
      sx={{
        display: 'inline-flex',
        color: 'inherit',
        textDecoration: 'none',
        ...sx,
      }}
      prefetch={true}
      {...props}
    >
      {children}
    </MuiLink>
  )
}

export default Link
