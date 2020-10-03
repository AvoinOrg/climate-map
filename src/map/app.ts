import * as LayerGroupState from 'src/map/LayerGroupState';
import { layerGroupDefinitions, layerGroupState } from './layer_groups';
import { getMapLayers, mapInit, moveLayer, onMapLoad, panTo, setLayoutProperty, zoomTo } from "./map";
import { flyTo } from './mapbox_map';
import { invertLayerTextHalo } from './utils';

const enableDefaultLayers = () => {
  const enabledGroups = Object.keys(layerGroupState).filter(g => layerGroupState[g])
  for (const group of enabledGroups) {
    const normalLayers = layerGroupDefinitions[group]
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
  let lat,lon,zoom
  try {
    lat = Number.parseFloat(hashParams.lat);
    lon = Number.parseFloat(hashParams.lon);
    panTo(lon, lat);
  } catch (e) { }

  try {
    zoom = Number.parseFloat(hashParams.zoom);
  } catch (e) { }

  const hasZoom = zoom >= 0 && zoom < 25 && !Number.isNaN(zoom)
  const hasLonLat = !Number.isNaN(lat) && !Number.isNaN(lon)
  if (hasZoom && hasLonLat) {
    flyTo(lon, lat, zoom)
  } else if (hasZoom) {
    zoomTo(zoom)
  } else if (hasLonLat) {
    panTo(lon, lat)
  }

  try {
    const layers = hashParams.layers.split(',')
    for (const layer of layers) { LayerGroupState.enableGroup(layer); }
  } catch (e) { }

}); // /map onload

mapInit();
