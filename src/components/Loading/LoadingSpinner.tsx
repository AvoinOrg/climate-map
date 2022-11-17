import React from 'react'
import { styled } from '@mui/material/styles'

export const LoadingSpinner = () => {
  return (
    <LdsEllipsis>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </LdsEllipsis>
  )
}

const LdsEllipsis = styled('div')(({ theme }) => ({
  ldsEllipsis: {
    display: 'inline-block',
    position: 'relative',
    width: '80px',
    height: '100%',
    '& div': {
      position: 'absolute',
      top: '33px',
      width: '13px',
      height: '13px',
      borderRadius: '50%',
      background: '#136b42',
      animationTimingFunction: 'cubic-bezier(0, 1, 1, 0)',
    },
    '& div:nth-child(1)': {
      left: '8px',
      animation: '$lds-ellipsis1 0.6s infinite',
    },
    '& div:nth-child(2)': {
      left: '8px',
      animation: '$lds-ellipsis2 0.6s infinite',
    },
    '& div:nth-child(3)': {
      left: '32px',
      animation: '$lds-ellipsis2 0.6s infinite',
    },
    '& div:nth-child(4)': {
      left: '56px',
      animation: '$lds-ellipsis3 0.6s infinite',
    },
  },
  '@keyframes lds-ellipsis1': {
    '0%': {
      transform: 'scale(0)',
    },
    '100%': {
      transform: 'scale(1)',
    },
  },
  '@keyframes lds-ellipsis3': {
    '0%': {
      transform: 'scale(1)',
    },
    '100%': {
      transform: 'scale(0)',
    },
  },
  '@keyframes lds-ellipsis2': {
    '0%': {
      transform: 'translate(0, 0)',
    },
    '100%': {
      transform: 'translate(24px, 0)',
    },
  },
}))
