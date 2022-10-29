import React, { useEffect } from 'react'
import { useHistory } from 'react-router-dom'
import MapContext from 'Components/Map'

// Some URLs are 1:1 associated with certain layer groups:
const urlLayerMapping = {
  '/layers/fi-forest': 'arvometsa',
  '/layers/fi-omaihka': 'fi-omaihka-topsoil',
  '/layers/fi-ffd': 'fi-ffd',
  '/layers/kariba_changes': 'kariba_changes_2019',
  '/layers/ekofolio': 'ekofolio',
  '/layers/fao-images-2021': 'fao-images-2021',
}

let activeUrlLayerGroup: any = null

const historyListener = (location: any, action: any) => {
  const { map, getGeocoder, activeLayers } = React.useContext(MapContext)
  console.debug(location, action)
  // TODO: add more sophisticated routing eventually?
  for (const [url, urlLayerGroup] of Object.entries(urlLayerMapping)) {
    if (location.pathname !== url && !location.pathname.startsWith(`${url}/`)) continue
    LayerGroupState.enableOnlyOneGroup(urlLayerGroup)
    activeUrlLayerGroup = urlLayerGroup
    return
  }
  if (activeUrlLayerGroup) {
    LayerGroupState.disableGroup(activeUrlLayerGroup)
  }
}
interface Props {
  children: React.ReactNode
}

export const URLLayerSyncContainer: React.FC<Props> = ({ children }) => {
  const history = useHistory()

  useEffect(() => {
    historyListener(document.location, 'INITIAL')
    const unlisten = history.listen(historyListener)
    return unlisten
  }, [history])

  return children
}
