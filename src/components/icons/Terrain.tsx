import * as React from 'react'
import type { SVGProps } from 'react'
const SvgTerrain = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={23} height={23} fill="none" {...props}>
    <path stroke="currentColor" strokeWidth={2} d="M1 1h21v21H1z" />
    <path stroke="currentColor" strokeWidth={2} d="M10 4c0 3-2.5 6-6 6M7 4c0 1.5-1.25 3-3 3" />
    <g fill="#000">
      <mask id="terrain_svg__a" width={17} height={9} x={3} y={10} maskUnits="userSpaceOnUse">
        <path fill="#fff" d="M3 10h17v9H3z" />
        <path fillRule="evenodd" d="M17.397 18 13.5 12l-3.285 5.058L8.5 15 6 18h11.397Z" clipRule="evenodd" />
      </mask>
      <path fillRule="evenodd" d="M17.397 18 13.5 12l-3.285 5.058L8.5 15 6 18h11.397Z" clipRule="evenodd" />
      <path
        d="m13.5 12 .839-.545-.839-1.29-.839 1.29.839.545Zm3.897 6v1h1.842l-1.003-1.545-.839.545Zm-7.182-.942-.768.64.868 1.042.739-1.137-.84-.545ZM8.5 15l.768-.64-.768-.922-.768.922.768.64ZM6 18l-.768-.64L3.865 19H6v-1Zm5 0v1h2.101l-1.325-1.63L11 18Zm0 0v-1H8.899l1.325 1.63L11 18Zm1.661-5.455 3.897 6 1.678-1.09-3.897-6-1.678 1.09Zm-1.607 5.057 3.285-5.057-1.678-1.09-3.285 5.058 1.678 1.09ZM7.731 15.64l1.715 2.058 1.536-1.28-1.715-2.058-1.536 1.28Zm-.964 3 2.5-3-1.536-1.28-2.5 3 1.536 1.28ZM11 17H6v2h5v-2Zm-.776 1.63 1.552-1.26-1.552 1.26ZM17.397 17H11v2h6.397v-2Z"
        mask="url(#terrain_svg__a)"
      />
    </g>
  </svg>
)
export default SvgTerrain
