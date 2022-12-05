import React from 'react'
import { observable, useObservable } from 'micro-observables'
import { MapContext } from '#/components/Map'

type Message = { message: string; layer: string }
const nullMessage: Message = { message: null, layer: null }

const overlayMessage = observable<Message>(nullMessage)

export const setOverlayMessage = (condition: boolean, message: Message) => {
  overlayMessage.set(condition ? message : nullMessage)
}

//OL_FIX: check later what is happening in this component and remove micro-observables
export const OverlayMessages: React.FC = () => {
  const { activeLayerGroups } = React.useContext(MapContext)
  const { message, layer } = useObservable(overlayMessage.readOnly())
  const isActive = activeLayerGroups.filter((x: any) => x.name === layer).length > 0

  if (!isActive) return null

  return (
    <div className="map-overlay-message-container">
      <div className="map-overlay-message">{message}</div>
    </div>
  )
}
