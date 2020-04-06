import { observable, useObservable } from "micro-observables";
import React, { useRef, useEffect } from "react";
import { getGeocoder, map } from "src/map/map";
import * as LayerGroupState from 'src/map/LayerGroupState';

const DEFAULT_PLACEHOLDER = 'Look up location'

type Placeholder = { placeholder: string; layer: string; }
const nullPlaceholder: Placeholder = { placeholder: null, layer: null }

const searchPlaceholder = observable<Placeholder>(nullPlaceholder);

export const setSearchPlaceholder = (x: Placeholder) => searchPlaceholder.set(x)

export const NavBarSearch = () => {
  const { placeholder, layer } = useObservable(searchPlaceholder.readOnly())
  const activeLayers = useObservable(LayerGroupState.layerGroups)
  const isActive = activeLayers.filter(x => x.name === layer).length > 0

  const geocoderSearchRef = useRef(null)
  useEffect(() => {
    const geocoder = getGeocoder()
    if (geocoder) geocoderSearchRef.current.appendChild(geocoder.onAdd(map))
  }, [geocoderSearchRef])

  useEffect(() => {
    const geocoder = getGeocoder()
    if (!geocoder) return
    geocoder._inputEl.placeholder = isActive ? placeholder : DEFAULT_PLACEHOLDER
  }, [geocoderSearchRef, isActive, placeholder, layer])

  return <div ref={geocoderSearchRef} />
}
