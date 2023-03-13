import React from 'react'
import { Box } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import Link from 'next/link'
import { Link as MuiLink } from '@mui/material'
import { useRouter, usePathname } from 'next/navigation'

import { getRoute } from '#/common/utils/routing'
import { routeTree } from '../routes'

// interface Props {
//   basePath: string
// }

const NavigationHeader = () => {
  const paths = usePathname()
  const router = useRouter()
  const Title = () => <Box sx={(theme) => ({ typography: theme.typography.subtitle1 })}>{paths}</Box>

  return (
    <Box sx={(theme) => ({ minHeight: '25px', display: 'flex', flexDirection: 'row' })}>
      {'asdf' ? (
        <MuiLink href={'asdf'} sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }} component={Link}>
          <ArrowBackIosNewIcon sx={(theme) => ({ float: 'left', cursor: 'pointer' })}></ArrowBackIosNewIcon>
          <Title />
        </MuiLink>
      ) : (
        <Title />
      )}
    </Box>
  )
}

export default NavigationHeader
