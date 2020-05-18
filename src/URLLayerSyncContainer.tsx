import { useHistory } from 'react-router-dom';
import { useEffect } from 'react';
import * as LayerGroupState from 'src/map/LayerGroupState';

// Some URLs are 1:1 associated with certain layer groups:
const urlLayerMapping = {
  '/layers/fi-forest': 'arvometsa',
  '/layers/fi-omaihka/1': 'fi-omaihka-layer1',
  '/layers/fi-omaihka/2': 'fi-omaihka-layer2',
}

let activeUrlLayerGroup = null

const historyListener = (location, action) => {
  console.debug(location, action)
  const urlLayerGroup = urlLayerMapping[location.pathname]
  if (urlLayerGroup) {
    LayerGroupState.enableOnlyOneGroup(urlLayerGroup)
    activeUrlLayerGroup = urlLayerGroup
  } else if (activeUrlLayerGroup) {
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
