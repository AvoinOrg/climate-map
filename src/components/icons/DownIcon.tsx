import React from 'react'
import { Box, Icon, SvgIcon } from '@mui/material'
import { SvgIconComponent } from '@mui/icons-material'

// const Img = () => (
//   <svg width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <path d="M16 1L8.5 9L1 0.999999" stroke="black" stroke-width="2" />
//   </svg>
// )

const DownIcon = (props: any) => (
  <SvgIcon {...props}>
    <svg width={24} height={24} viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M16 1 8.5 9 1 1" stroke="#000" strokeWidth={2} />
    </svg>
  </SvgIcon>
)

export default DownIcon
