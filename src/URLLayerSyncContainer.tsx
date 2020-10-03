import { useHistory } from 'react-router-dom';
import { useEffect } from 'react';
import * as LayerGroupState from 'src/map/LayerGroupState';

// Some URLs are 1:1 associated with certain layer groups:
const urlLayerMapping = {
  '/layers/fi-forest': 'arvometsa',
  '/layers/fi-omaihka': 'fi-omaihka-topsoil',
  '/layers/fi-ffd': 'fi-ffd',
}

let activeUrlLayerGroup = null

const historyListener = (location, action) => {
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

export const URLLayerSyncContainer = ({children}) => {
  const history = useHistory()

  useEffect(() => {
    historyListener(document.location, 'INITIAL')
    const unlisten = history.listen(historyListener)
    return unlisten
  }, [history])

  return children
}
