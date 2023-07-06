import * as React from 'react'
import type { SVGProps } from 'react'
const SvgRadioButtonUnchecked = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} fill="none" {...props}>
    <mask
      id="radio_button_unchecked_svg__a"
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
    <g mask="url(#radio_button_unchecked_svg__a)">
      <path
        fill="#1C1B1F"
        d="M12.002 21.5a9.255 9.255 0 0 1-3.705-.748 9.598 9.598 0 0 1-3.018-2.03 9.591 9.591 0 0 1-2.03-3.016 9.245 9.245 0 0 1-.749-3.704c0-1.314.25-2.55.748-3.705a9.597 9.597 0 0 1 2.03-3.018 9.592 9.592 0 0 1 3.016-2.03 9.245 9.245 0 0 1 3.704-.749c1.314 0 2.55.25 3.705.748a9.597 9.597 0 0 1 3.018 2.03 9.592 9.592 0 0 1 2.03 3.016 9.245 9.245 0 0 1 .749 3.704c0 1.314-.25 2.55-.748 3.705a9.598 9.598 0 0 1-2.03 3.018 9.592 9.592 0 0 1-3.016 2.03 9.245 9.245 0 0 1-3.704.749ZM12 20c2.233 0 4.125-.775 5.675-2.325C19.225 16.125 20 14.233 20 12c0-2.233-.775-4.125-2.325-5.675C16.125 4.775 14.233 4 12 4c-2.233 0-4.125.775-5.675 2.325C4.775 7.875 4 9.767 4 12c0 2.233.775 4.125 2.325 5.675C7.875 19.225 9.767 20 12 20Z"
      />
    </g>
  </svg>
)
export default SvgRadioButtonUnchecked
