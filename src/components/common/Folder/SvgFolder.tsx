import React from 'react'
import type { SVGProps } from 'react'

type Props = SVGProps<SVGSVGElement> & {
  color?: string
  borderColor?: string
}

const SvgFolder = ({ color, borderColor, ...props }: Props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="9 5 348 137"
    fill="none"
    {...props}
  >
    <g>
      <path
        d="M10 136V11C10 8.23858 12.2386 6 15 6H60.7511C61.8415 6 62.902 6.35643 63.771 7.015L81.0163 20.0837C81.8853 20.7423 82.9458 21.0987 84.0361 21.0987H350C352.761 21.0987 355 23.3373 355 26.0987V136C355 138.761 352.761 141 350 141H15C12.2386 141 10 138.761 10 136Z"
        fill={color}
      />
      <path
        d="M10.5 136V11C10.5 8.51472 12.5147 6.5 15 6.5H60.7511C61.7324 6.5 62.6869 6.82079 63.469 7.4135L80.7143 20.4822C81.6702 21.2066 82.8367 21.5987 84.0361 21.5987H350C352.485 21.5987 354.5 23.6134 354.5 26.0987V136C354.5 138.485 352.485 140.5 350 140.5H15C12.5147 140.5 10.5 138.485 10.5 136Z"
        stroke={borderColor ? borderColor : color}
      />
    </g>
  </svg>
)

export default SvgFolder
