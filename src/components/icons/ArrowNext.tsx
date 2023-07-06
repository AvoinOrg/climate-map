import * as React from 'react'
import type { SVGProps } from 'react'
const SvgArrowNext = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={22} height={16} fill="none" {...props}>
    <g stroke="#000" strokeWidth={2}>
      <path d="M1 1v14M4.5 8H21M14 1.5 20.5 8 14 14.5" />
    </g>
  </svg>
)
export default SvgArrowNext
