import { map } from '../../map/map'
import * as LayerGroupState from '../../map/LayerGroupState'

// These help in development and debugging:
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  window.map = map
  // @ts-ignore
  window.LayerGroupState = LayerGroupState

  const devBanner = document.createElement('div')
  devBanner.innerHTML = `
  <h1 onclick="map.showTileBoundaries=!map.showTileBoundaries"
  style="position:absolute; top:0;left:50vw; z-index:9999; color:red; cursor:pointer">
    DEV MODE
  </h1>
  `
  document.body.appendChild(devBanner)
}
