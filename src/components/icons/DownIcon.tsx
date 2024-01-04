import React from 'react'
import { Box, SxProps, Theme } from '@mui/material'

type Props = {
  sx?: SxProps<Theme>
}
const DownIcon = (props: Props) => (
  <Box
    component={'svg'}
    width={24}
    height={24}
    viewBox="0 0 17 11"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M16 1 8.5 9 1 1" stroke="currentColor" strokeWidth={2} />
  </Box>
)

export default DownIcon
