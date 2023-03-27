import React from 'react'
import { Box } from '@mui/material'
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew'
import Link from 'next/link'
import { Link as MuiLink } from '@mui/material'

// interface Props {
//   basePath: string
// }

const NavigationBack = ({ route, label = 'Takaisin' }: { route: string; label?: string }) => {
  // const router = useRouter()
  const Title = () => <Box sx={(theme) => ({ typography: theme.typography.subtitle1 })}>{label}</Box>

  return (
    <Box sx={(theme) => ({ minHeight: '25px', display: 'flex', flexDirection: 'row', margin: '20px 0 60px 0' })}>
      <MuiLink href={route} sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }} component={Link}>
        <ArrowBackIosNewIcon sx={(theme) => ({ float: 'left', cursor: 'pointer' })}></ArrowBackIosNewIcon>
        <Title />
      </MuiLink>
    </Box>
  )
}

export default NavigationBack
