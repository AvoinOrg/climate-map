import * as React from 'react'
import type { SVGProps } from 'react'
const SvgStar = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={26} height={26} fill="none" {...props}>
    <path
      stroke="#000"
      strokeWidth={2}
      d="m13 3.236 1.968 6.056.224.69h7.094l-5.151 3.743-.588.428.224.69L18.74 20.9l-5.151-3.742L13 16.73l-.588.427-5.151 3.742 1.968-6.056.224-.69-.588-.428-5.151-3.742h7.094l.224-.691L13 3.236Z"
    />
  </svg>
)
export default SvgStar
