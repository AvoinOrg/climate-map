import React, { Ref } from 'react'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'

interface Props {
  onClose: () => void
  children?: React.ReactNode
}

export const MapPopup = React.forwardRef((props: Props, ref: Ref<HTMLDivElement>) => {
  return (
    //   <Box
    //   ref={mapRef}
    //   id="map"
    //   className="ol-map"
    //   sx={{
    //     position: 'absolute',
    //     top: 0,
    //     bottom: 0,
    //     width: '100vw',
    //     height: '100vh',
    //     '.ol-scale-line': { right: '8px', left: 'auto', bottom: '26px' },
    //   }}
    // ></Box>
    <Box ref={ref}>
      <PopupContainer>
        <PopupCloser onClick={props.onClose} />
        {props.children}
      </PopupContainer>
    </Box>
  )
})

const PopupContainer = styled('div')(({ theme }) => ({
  position: 'absolute',
  backgroundColor: 'white',
  filter: 'drop-shadow(0 1px 4px rgba(0, 0, 0, 0.2))',
  padding: '15px',
  borderRadius: '10px',
  border: '1px solid #cccccc',
  bottom: '12px',
  left: '-50px',
  minWidth: '280px',

  '&:after, &:before': {
    top: '100%',
    border: 'solid transparent',
    content: "' '",
    height: 0,
    width: 0,
    position: 'absolute',
    pointerEvents: 'none',
  },

  '&:after': {
    borderTopColor: 'white',
    borderWidth: '10px',
    left: '48px',
    marginLeft: '-10px',
  },

  '&:before': { borderTopColor: '#cccccc', borderWidth: '11px', left: '48px', marginLeft: '-11px' },
}))

const PopupCloser = styled('div')(({ theme }) => ({
  textDecoration: 'none',
  position: 'absolute',
  top: '2px',
  right: '8px',

  '&:after': {
    content: "'✖'",
  },
}))
