import { map } from '../../map/map'
import { layerGroupState, layerGroupService } from '../../map/layer_groups'

// These help in development and debugging:
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  window.map = map;
  // @ts-ignore
  window.layerGroupState = layerGroupState;
  // @ts-ignore
  window.layerGroupService = layerGroupService

  const devBanner = document.createElement('div')
  devBanner.innerHTML = `
  <h1 onclick="map.showTileBoundaries=!map.showTileBoundaries"
  style="position:absolute; top:0;left:50vw; z-index:9999; color:red; cursor:pointer">
    DEV MODE
  </h1>
  `
  document.body.appendChild(devBanner)
}
