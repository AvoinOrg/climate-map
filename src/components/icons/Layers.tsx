import * as React from 'react'
import type { SVGProps } from 'react'
const SvgLayers = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="none" {...props}>
    <mask
      id="layers_svg__a"
      width={24}
      height={24}
      x={0}
      y={0}
      maskUnits="userSpaceOnUse"
      style={{
        maskType: 'alpha',
      }}
    >
      <path fill="#D9D9D9" d="M0 0h24v24H0z" />
    </mask>
    <g mask="url(#layers_svg__a)">
      <path
        fill="#1C1B1F"
        d="M12.454 24 1 15.1l1.715-1.317 9.74 7.539 9.738-7.54 1.715 1.318L12.454 24Zm0-6.2L1 8.9 12.454 0l11.454 8.9-11.454 8.9Zm0-2.678 8.04-6.222-8.04-6.222L4.414 8.9l8.04 6.222Z"
      />
    </g>
  </svg>
)
export default SvgLayers
