import * as React from 'react'
import type { SVGProps } from 'react'
const SvgArrowRight = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={13} height={20} fill="none" {...props}>
    <path stroke="#000" strokeWidth={2} d="m1 1 10 9-10 9" />
  </svg>
)
export default SvgArrowRight
