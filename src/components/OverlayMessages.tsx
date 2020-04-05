import React from 'react'
import { observable, useObservable } from "micro-observables";
import { layerGroupService } from 'src/map/layer_groups';

type Message = { message: string; layer: string; }
const nullMessage = { message: null, layer: null }

const overlayMessage = observable<Message>(nullMessage);

export const setOverlayMessage = (condition: boolean, message: Message) => {
  overlayMessage.set(condition ? message : nullMessage)
}

const OverlayMessages = () => {
  const { message, layer } = useObservable(overlayMessage.readOnly())
  const activeLayers = useObservable(layerGroupService.layerGroups)
  const isActive = activeLayers.filter(x => x.name === layer).length > 0

  if (!isActive) return null

  return <div className='map-overlay-message-container'>
    <div className='map-overlay-message'>
      {message}
    </div>
  </div>
}

export default OverlayMessages
