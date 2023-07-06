import * as React from 'react'
import type { SVGProps } from 'react'
const SvgCheckbox = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={23} height={23} fill="none" {...props}>
    <path fill="#F4F4F4" d="M0 0h23v23H0z" />
    <path stroke="#A0A0A0" strokeWidth={2} d="M1 1h21v21H1z" />
  </svg>
)
export default SvgCheckbox
