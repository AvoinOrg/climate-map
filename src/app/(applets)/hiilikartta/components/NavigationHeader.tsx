import React from 'react'
import { Box } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import Link from 'next/link'
import { Link as MuiLink } from '@mui/material'

interface Props {
  text: string
  route: string
}

const NavigationHeader = ({ text, route }: Props) => {
  const Title = () => <Box sx={(theme) => ({ typography: theme.typography.subtitle1 })}>{text}</Box>

  return (
    <Box sx={(theme) => ({ minHeight: '25px', display: 'flex', flexDirection: 'row' })}>
      {route ? (
        <MuiLink href={route} sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }} component={Link}>
          <Title />
          <ArrowBackIosNewIcon sx={(theme) => ({ float: 'left', cursor: 'pointer' })}></ArrowBackIosNewIcon>
        </MuiLink>
      ) : (
        <Title />
      )}
    </Box>
  )
}

export default NavigationHeader
