import React from 'react'
import { observable, useObservable } from "micro-observables";

const overlayMessage = observable<string>(null);

export const setOverlayMessage = (condition: boolean, message: string) => {
  overlayMessage.set(condition ? message : null)
}

const OverlayMessages = () => {
  const message = useObservable(overlayMessage.readOnly())

  return <div className='map-overlay-message-container'>
    <div className='map-overlay-message'>
      {message}
    </div>
  </div>
}

export default OverlayMessages
