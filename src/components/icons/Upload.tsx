import * as React from 'react'
import type { SVGProps } from 'react'
const SvgUpload = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={16} height={22} fill="none" {...props}>
    <g stroke="currentColor" strokeWidth={2}>
      <path d="M1 17v4h14v-4M8 17.5V1M1.5 8 8 1.5 14.5 8" />
    </g>
  </svg>
)
export default SvgUpload
