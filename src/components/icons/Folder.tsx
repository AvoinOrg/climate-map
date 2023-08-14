import * as React from 'react'
import type { SVGProps } from 'react'
const SvgFolder = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={365}
    height={155}
    fill="none"
    {...props}
  >
    <g filter="url(#folder_svg__a)">
      <path fill="#AFB39A" d="M10 141V6h52.432l19.924 15.099H355V141H10Z" />
      <path
        stroke="#D9D9D9"
        d="m82.054 21.497.134.102H354.5V140.5h-344V6.5h51.764l19.79 14.997Z"
      />
    </g>
    <defs>
      <filter
        id="folder_svg__a"
        width={365}
        height={155}
        x={0}
        y={0}
        colorInterpolationFilters="sRGB"
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset dy={4} />
        <feGaussianBlur stdDeviation={5} />
        <feComposite in2="hardAlpha" operator="out" />
        <feColorMatrix values="0 0 0 0 0.845833 0 0 0 0 0.83526 0 0 0 0 0.83526 0 0 0 1 0" />
        <feBlend
          in2="BackgroundImageFix"
          result="effect1_dropShadow_1084_2758"
        />
        <feBlend
          in="SourceGraphic"
          in2="effect1_dropShadow_1084_2758"
          result="shape"
        />
      </filter>
    </defs>
  </svg>
)
export default SvgFolder
