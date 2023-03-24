import React from 'react'
import { SvgIcon } from '@mui/material'

// const Img = () => (
//   <svg width="17" height="11" viewBox="0 0 17 11" fill="none" xmlns="http://www.w3.org/2000/svg">
//     <path d="M16 1L8.5 9L1 0.999999" stroke="black" stroke-width="2" />
//   </svg>
// )

const HamburgerOpen = (props: any) => (
  <SvgIcon {...props}>
    <svg width={44} height={16} fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path fill="#000" d="M23.913 0H44v6H23.913zM0 0h20.087v6H0zM23.913 10H44v6H23.913zM0 10h20.087v6H0z" />
    </svg>
    )
  </SvgIcon>
)

export default HamburgerOpen
