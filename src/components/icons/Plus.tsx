import * as React from 'react'
import type { SVGProps } from 'react'
const SvgPlus = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={20} height={20} fill="none" {...props}>
    <path stroke="#000" strokeWidth={2} d="M0 9.73h20M10 0v20" />
  </svg>
)
export default SvgPlus
