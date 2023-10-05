import * as React from 'react'
import type { SVGProps } from 'react'
const SvgTerrain = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
  >
    <rect
      x="1"
      y="1"
      width="22"
      height="22"
      rx="2"
      stroke="black"
      stroke-width="2"
    />
    <path d="M11 5C11 8 8.5 11 5 11" stroke="black" stroke-width="2" />
    <path d="M8 5C8 6.5 6.75 8 5 8" stroke="black" stroke-width="2" />
    <mask
      id="path-4-outside-1_14_521"
      maskUnits="userSpaceOnUse"
      x="4"
      y="11"
      width="17"
      height="9"
      fill="black"
    >
      <rect fill="white" x="4" y="11" width="17" height="9" />
      <path
        fill-rule="evenodd"
        clip-rule="evenodd"
        d="M18.3971 19L14.5 13L11.2149 18.0578L9.5 16L7 19H12L12 19H18.3971Z"
      />
    </mask>
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M18.3971 19L14.5 13L11.2149 18.0578L9.5 16L7 19H12L12 19H18.3971Z"
      fill="black"
    />
    <path
      d="M14.5 13L15.3386 12.4553L14.5 11.1641L13.6614 12.4553L14.5 13ZM18.3971 19V20H20.2391L19.2358 18.4553L18.3971 19ZM11.2149 18.0578L10.4466 18.698L11.3148 19.7398L12.0535 18.6025L11.2149 18.0578ZM9.5 16L10.2682 15.3598L9.5 14.438L8.73178 15.3598L9.5 16ZM7 19L6.23178 18.3598L4.86496 20H7V19ZM12 19V20H14.101L12.7761 18.3694L12 19ZM12 19V18H9.89902L11.2239 19.6306L12 19ZM13.6614 13.5447L17.5585 19.5447L19.2358 18.4553L15.3386 12.4553L13.6614 13.5447ZM12.0535 18.6025L15.3386 13.5447L13.6614 12.4553L10.3762 17.5131L12.0535 18.6025ZM8.73178 16.6402L10.4466 18.698L11.9831 17.4177L10.2682 15.3598L8.73178 16.6402ZM7.76822 19.6402L10.2682 16.6402L8.73178 15.3598L6.23178 18.3598L7.76822 19.6402ZM12 18H7V20H12V18ZM11.2239 19.6306L11.2239 19.6306L12.7761 18.3694L12.7761 18.3694L11.2239 19.6306ZM18.3971 18H12V20H18.3971V18Z"
      fill="black"
      mask="url(#path-4-outside-1_14_521)"
    />
  </svg>
)
export default SvgTerrain
