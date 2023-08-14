import * as React from 'react'
import type { SVGProps } from 'react'
const SvgDownload = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={17} height={24} fill="none" {...props}>
    <g stroke="currentColor" strokeWidth={2}>
      <path d="M8.5 0v16.5M15 10.5 8.5 17 2 10.5M1 19v4h15v-4" />
    </g>
  </svg>
)
export default SvgDownload
