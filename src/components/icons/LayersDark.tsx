import * as React from 'react'
import type { SVGProps } from 'react'
const SvgLayersDark = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="none" {...props}>
    <mask
      id="layers-dark_svg__a"
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
    <g mask="url(#layers-dark_svg__a)">
      <path
        fill="#1C1B1F"
        d="M11.5 24.096 0 15.161l1.722-1.323 9.778 7.57 9.778-7.57L23 15.16l-11.5 8.935Zm0-6.225L0 8.935 11.5 0 23 8.935l-11.5 8.936Z"
      />
    </g>
  </svg>
)
export default SvgLayersDark
