import * as React from 'react'
import type { SVGProps } from 'react'
const SvgCheckboxChecked = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={23} height={23} fill="none" {...props}>
    <path fill="#274AFF" fillOpacity={0.35} stroke="currentColor" strokeWidth={2} d="M1 1h21v21H1z" />
    <path stroke="currentColor" strokeWidth={2} d="m5 10.5 5 5.5 8-9" />
  </svg>
)
export default SvgCheckboxChecked
