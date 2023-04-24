'use client'

import React, { useEffect } from 'react'
import Box from '@mui/material/Box'
import { styled } from '@mui/material/styles'
// import { MapboxGeoJSONFeature } from 'mapbox-gl'
// import Feature from 'ol/Feature'
// import { PopupOpts } from '#/common/types/map'
import { MapContext } from './Map'

export const MapPopup = () => {
  const [popupFeatures, setPopupFeatures] = React.useState<any[]>()
  const { popupOpts } = React.useContext(MapContext)

  useEffect(() => {
    if (!popupOpts) {
      setPopupFeatures(undefined)
    } else {
      // check if the object is an ol feature
      //@ts-ignore
      if (popupOpts.features[0].getProperties) {
        //@ts-ignore
        setPopupFeatures(popupOpts.features.map((f) => f.getProperties()))
      } else {
        setPopupFeatures(popupOpts.features)
      }
    }
  }, [popupOpts])

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
    <>
      {popupOpts && (
        <Box>
          <PopupContainer>
            {popupFeatures && <popupOpts.PopupElement features={popupFeatures}></popupOpts.PopupElement>}
          </PopupContainer>
        </Box>
      )}
    </>
  )
}

const PopupContainer = styled('div')(({ theme }) => ({
  // position: 'absolute',
  padding: '15px',
  // bottom: '12px',
  // left: '-50px',
  minWidth: '200px',
  maxWidth: '480px',
  // '&:after, &:before': {
  //   top: '100%',
  //   border: 'solid transparent',
  //   content: "' '",
  //   height: 0,
  //   width: 0,
  //   position: 'absolute',
  //   pointerEvents: 'none',
  // },

  // '&:after': {
  //   borderTopColor: 'white',
  //   borderWidth: '10px',
  //   left: '48px',
  //   marginLeft: '-10px',
  // },

  // '&:before': { borderTopColor: '#cccccc', borderWidth: '11px', left: '48px', marginLeft: '-11px' },
}))
