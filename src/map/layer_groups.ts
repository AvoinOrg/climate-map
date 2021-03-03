import * as LayerGroupState from 'src/map/LayerGroupState';
import { moveLayer, setLayoutProperty } from './map';
import { assert, execWithMapLoaded, originalLayerDefs } from './utils';
import * as Analytics from './analytics'

const backgroundLayerGroups = { 'terramonitor': true }
interface ILayerGroupState { [s: string]: boolean; }
export const layerGroupState: ILayerGroupState = {
  terramonitor: true,
  ete: false,
}

export const hideAllLayersMatchingFilter: (filterFn: (group: string) => boolean) => void
  = (filterFn) => {
    for (const group of Object.keys(layerGroupState)) {
      if (group in backgroundLayerGroups) return;
      if (filterFn && !filterFn(group)) return;
      LayerGroupState.disableGroup(group);
    }
  }

interface ILayerGroups { [s: string]: (string | (() => void))[] }
export const layerGroupDefinitions: ILayerGroups = {}

export const toggleGroupInternal = (group: string, forcedState?: boolean) => {
  assert(group in layerGroupDefinitions, `Layer group ${group} not in layerGroups`)
  console.debug('toggleGroup:', group, forcedState)

  const oldState = layerGroupState[group];
  const newState = forcedState === undefined ? !oldState : forcedState;
  if (oldState === newState) return;

  for (const layer of layerGroupDefinitions[group]) {
    if (typeof layer === 'function') {
      execWithMapLoaded(layer);
    } else {
      assert(layer in originalLayerDefs, `Layer does not exist: ${JSON.stringify(layer)}`);
      const { BEFORE } = originalLayerDefs[layer];
      assert(BEFORE, `Layer ${layer} does not contain a BEFORE declaration: JSON.stringify(originalLayerDefs[layer])`);

      execWithMapLoaded(() => {
        moveLayer(layer, BEFORE); // Make this the topmost layer.
        setLayoutProperty(layer, 'visibility', newState ? 'visible' : 'none');
      })
    }
  }
  layerGroupState[group] = newState;

  if (group in backgroundLayerGroups) return;

  if (newState) Analytics.recordLayerActivation(group)
}


export const registerGroup = (groupName: string, groupLayers: any[]) => {
  layerGroupDefinitions[groupName] = groupLayers
}
