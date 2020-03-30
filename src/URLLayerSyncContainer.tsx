import { layerGroupService } from './map/layer_groups';
import { useHistory } from 'react-router-dom';
import { useEffect } from 'react';


// Some URLs are 1:1 associated with certain layer groups:
const urlLayerMapping = {
  '/layers/fi-forest': 'arvometsa',
}

let activeUrlLayerGroup = null
export const URLLayerSyncContainer = ({children}) => {
  const history = useHistory()

  useEffect(() => {
    const unlisten = history.listen((location, action) => {
      console.debug(location, action)
      const urlLayerGroup = urlLayerMapping[location.pathname]
      if (urlLayerGroup) {
        layerGroupService.enableOnlyOneGroup(urlLayerGroup)
        activeUrlLayerGroup = urlLayerGroup
      } else if (activeUrlLayerGroup) {
        layerGroupService.disableGroup(activeUrlLayerGroup)
      }
    })
    return unlisten
  }, [history])

  return children
}
