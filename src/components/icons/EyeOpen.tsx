import * as React from 'react'
import type { SVGProps } from 'react'
const SvgEyeOpen = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={23} height={13} fill="none" {...props}>
    <path
      stroke="currentColor"
      strokeLinecap="square"
      strokeWidth={2}
      d="M22.076 6.118c0 .001 0 .002-.002.003h0l.002-.002h0Zm-.219.423c-.058.102-.13.22-.214.35a9.11 9.11 0 0 1-1.626 1.857c-1.537 1.346-4.12 2.752-8.272 2.752-4.156 0-6.872-1.408-8.543-2.774a10.409 10.409 0 0 1-1.8-1.88 8.32 8.32 0 0 1-.216-.31A14.752 14.752 0 0 1 3.575 4.02C5.407 2.5 8.125 1 11.745 1c3.613 0 6.2 1.493 7.9 2.999.853.755 1.479 1.51 1.889 2.074.13.178.237.336.323.468Z"
    />
    <circle cx={11.5} cy={6.5} r={2.5} fill="#000" />
  </svg>
)
export default SvgEyeOpen
