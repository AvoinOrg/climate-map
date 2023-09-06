import React from 'react'
import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & {
  color?: string
  borderColor?: string
}

const SvgFolder = ({ color, borderColor, ...props }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 355 141"
    fill="none"
    {...props}
  >
    <g>
      <path
        fill={color}
        stroke={borderColor ? borderColor : color}
        stroke-width="2"
        d="M2 139V8h50.432l19.924 13.099H353V139H2Z"
      />
    </g>
  </svg>
)

export default SvgFolder
