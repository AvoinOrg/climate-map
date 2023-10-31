import * as React from 'react'
import type { SVGProps } from 'react'

const SvgDelete = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={22}
    height={25}
    fill="none"
    {...props}
  >
    <path
      fill="currentColor"
      d="M4.353 24.042c-.707 0-1.31-.25-1.81-.751-.501-.5-.751-1.104-.751-1.81V3.5H.375V1.375H6.75V.122h8.5v1.253h6.375V3.5h-1.417v17.98c0 .716-.248 1.322-.743 1.818a2.472 2.472 0 0 1-1.818.744H4.353ZM18.083 3.5H3.917v17.98c0 .128.04.232.122.314a.424.424 0 0 0 .314.123h13.294a.417.417 0 0 0 .3-.137c.09-.09.136-.19.136-.3V3.5ZM7.323 19.083h2.124V6.333H7.322v12.75Zm5.23 0h2.125V6.333h-2.125v12.75Z"
    />
  </svg>
)
export default SvgDelete
