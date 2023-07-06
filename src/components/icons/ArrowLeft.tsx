import * as React from 'react'
import type { SVGProps } from 'react'
const SvgArrowLeft = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={13} height={20} fill="none" {...props}>
    <path stroke="#000" strokeWidth={2} d="M12 19 2 10l10-9" />
  </svg>
)
export default SvgArrowLeft
