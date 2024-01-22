import React from 'react'
import { Box, SxProps, Theme } from '@mui/material'

type Props = {
  sx?: SxProps<Theme>
}
const Polyline = (props: Props) => (
  <Box
    component={'svg'}
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <mask
      id="mask0_708_757"
      style={{ maskType: 'alpha' }}
      maskUnits="userSpaceOnUse"
      x="0"
      y="0"
      width="24"
      height="24"
    >
      <rect width="24" height="24" fill="none" />
    </mask>
    <g mask="url(#mask0_708_757)">
      <path
        d="M15.25 21.75V19.3462L8.05768 15.75H3.25V10.25H7.41538L10.25 6.99615V2.25002H15.75V7.74997H11.5846L8.74995 11.0038V14.4039L15.25 17.6539V16.25H20.75V21.75H15.25ZM11.75 6.25003H14.25V3.74997H11.75V6.25003ZM4.74995 14.25H7.25V11.75H4.74995V14.25ZM16.75 20.25H19.25V17.75H16.75V20.25Z"
        fill="currentColor"
      />
    </g>
  </Box>
)

export default Polyline
