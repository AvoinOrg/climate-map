import React from 'react'
import { observable, useObservable } from 'micro-observables'
import { MapContext } from '#/components/Map'

type Message = { message: string | null; layer: string | null }
const nullMessage: Message = { message: null, layer: null }

const overlayMessage = observable<Message>(nullMessage)

export const setOverlayMessage = (condition: boolean, message: Message) => {
  overlayMessage.set(condition ? message : nullMessage)
}

//TODO: check later what is happening in this component and remove micro-observables
export const OverlayMessages: React.FC = () => {
  const { activeLayerGroupIds } = React.useContext(MapContext)
  const { message, layer } = useObservable(overlayMessage.readOnly())
  const isActive = activeLayerGroupIds.filter((x: any) => x === layer).length > 0

  if (!isActive) return null

  return (
    <div className="map-overlay-message-container">
      <div className="map-overlay-message">{message}</div>
    </div>
  )
}
