import * as React from 'react'
import { Box, SxProps, Theme } from '@mui/material'

type Props = {
  sx?: SxProps<Theme>
}

const SvgArrowDown = (props: Props) => (
  <Box
    component="svg"
    xmlns="http://www.w3.org/2000/svg"
    width={17}
    height={11}
    viewBox="0 0 17 11"
    fill="none"
    {...props}
  >
    <path stroke="currentColor" strokeWidth={2} d="M16 1 8.5 9 1 1" />
  </Box>
)

export default SvgArrowDown
