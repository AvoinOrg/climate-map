import { observable } from "micro-observables";
import { toggleGroupInternal } from "./layer_groups";

type LayerGroupReference = { name: string }

const _layerGroups = observable<LayerGroupReference[]>([]);

export const layerGroups = _layerGroups.readOnly()

export const enableGroup = (name: string) => {
  _layerGroups.update(layerGroups => [...layerGroups.filter(x => x.name !== name), { name }])
  toggleGroupInternal(name, true)
}

export const disableGroup = (name: string) => {
  _layerGroups.update(layerGroups => [...layerGroups.filter(x => x.name !== name)])
  toggleGroupInternal(name, false)
}

export const setGroupState = (name: string, enabled: boolean) => {
  if (enabled) enableGroup(name)
  else disableGroup(name)
}

export const toggleGroup = (name: string) => {
  _layerGroups.update(layerGroups => {
    const newGroups = [...layerGroups.filter(x => x.name !== name)]
    if (newGroups.length === layerGroups.length) newGroups.push({ name })
    toggleGroupInternal(name, newGroups.length === layerGroups.length)
    return newGroups
  })
}

export const enableOnlyOneGroup = (name: string) => {
  _layerGroups.get().filter(x => x.name !== name).forEach(x => toggleGroupInternal(x.name, false))
  _layerGroups.set([{ name }])
  toggleGroupInternal(name, true)
}
