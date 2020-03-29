import { invertLayerTextHalo } from './utils';
import { layerGroups, layerGroupState, layerGroupService } from './layer_groups';
import { setLayoutProperty, getMapLayers, moveLayer, zoomTo, mapInit, panTo, onMapLoad } from "./map";


const enableDefaultLayers = () => {
  const enabledGroups = Object.keys(layerGroupState).filter(g => layerGroupState[g])
  for (const group of enabledGroups) {
    const normalLayers = layerGroups[group]
      .filter((l: any) => typeof l === 'string') as string[]
    for (const layer of normalLayers) {
      setLayoutProperty(layer, 'visibility', 'visible');
    }
  }
}

onMapLoad(() => {
  enableDefaultLayers();

  // Ensure all symbol layers appear on top of satellite imagery.
  getMapLayers()
    .filter(x => x.type === 'symbol')
    .forEach(layer => {
      // Rework Stadia default style to look nicer on top of satellite imagery
      invertLayerTextHalo(layer)
      layer.BEFORE = layer.BEFORE || 'BG_LABEL';
      moveLayer(layer.id, layer.BEFORE)
    });


  // A simple way to open the map in a certain location with certain layers enabled.

  interface IHashParams {
    lat: string
    lon: string
    zoom: string
    layers: string
  }
  const hashParams: IHashParams =
    window.location.hash.replace(/^[#?]*/, '').split('&').reduce((prev, item) => (
      Object.assign({ [item.split('=')[0]]: item.split('=')[1] }, prev)
    ), {}) as IHashParams;

  // TODO: fix command race condition here when using mapbox-gl
  try {
    const lat = Number.parseFloat(hashParams.lat);
    const lon = Number.parseFloat(hashParams.lon);
    panTo(lon, lat);
  } catch (e) { }

  try {
    const zoom = Number.parseFloat(hashParams.zoom);
    if (zoom >= 0 && zoom < 25 && !Number.isNaN(zoom)) { zoomTo(zoom); }
  } catch (e) { }

  try {
    const layers = hashParams.layers.split(',')
    for (const layer of layers) { layerGroupService.enableGroup(layer); }
  } catch (e) { }

}); // /map onload

mapInit();
