import * as React from 'react'
import type { SVGProps } from 'react'

const SvgPolygon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={30}
    height={32}
    viewBox="0 0 30 32"
    fill="none"
    {...props}
  >
    <rect
      x="1.12891"
      y="5.69815"
      width="6.08806"
      height="6.08806"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path d="M24 8L26 25" stroke="currentColor" strokeWidth={2} />
    <path d="M7 7L21 5" stroke="currentColor" strokeWidth={2} />
    <rect
      x="20.3926"
      y="1.61008"
      width="6.08806"
      height="6.08806"
      stroke="currentColor"
      strokeWidth={2}
    />
    <rect
      x="22.4375"
      y="24.4403"
      width="6.08806"
      height="6.08806"
      stroke="currentColor"
      strokeWidth={2}
    />
    <path d="M6 11L23 25" stroke="currentColor" strokeWidth={2} />
  </svg>
)

export default SvgPolygon
