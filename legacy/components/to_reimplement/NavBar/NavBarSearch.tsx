'use client'

import { observable, useObservable } from 'micro-observables'
import React, { useRef, useEffect } from 'react'
import { useMapStore } from '#/common/store'

const DEFAULT_PLACEHOLDER = 'Look up location'

type Placeholder = { placeholder: string | null; layer: string | null }
const nullPlaceholder: Placeholder = { placeholder: null, layer: null }

const searchPlaceholder = observable<Placeholder>(nullPlaceholder)

export const setSearchPlaceholder = (x: Placeholder) => searchPlaceholder.set(x)

// TODO: Fix search

export const NavBarSearch: React.FC = () => {
  // const { map, getGeocoder, activeLayerGroupIds } = React.useContext(MapContext)
  // const activeLayerGroupIds = useMapStore((state) => state.activeLayerGroupIds)
  // const { placeholder, layer } = useObservable(searchPlaceholder.readOnly())
  // const isActive = activeLayerGroupIds.filter((x) => x === layer).length > 0

  // const geocoderSearchRef = useRef(null)
  // useEffect(() => {
  //   const geocoder = getGeocoder()
  //   if (geocoder) geocoderSearchRef.current.appendChild(geocoder.onAdd(map))
  // }, [geocoderSearchRef])

  // useEffect(() => {
  //   const geocoder = getGeocoder()
  //   if (!geocoder) return
  //   geocoder._inputEl.placeholder = isActive ? placeholder : DEFAULT_PLACEHOLDER
  // }, [geocoderSearchRef, isActive, placeholder, layer])

  // return <div ref={geocoderSearchRef} />
  return null
}
