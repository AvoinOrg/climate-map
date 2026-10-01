import { uniq, isEqual, pickBy, uniqBy } from 'lodash-es'
import { produce } from 'immer'
import { MapGeoJSONFeature } from 'maplibre-gl'
import { useMapInstanceStore } from './mapInstanceStore'
import { getActiveDrawInstance } from './mapDrawSlice'
import {
  PopupData,
  PopupOpts,
  SelectionSource,
  ExtendedMapGeoJSONFeature,
  LayerOptions,
  LayerOptionsObj,
  LayerGroups,
} from '#/common/types/map'
import {
  getAllLayerOptionsObj,
  getJoinedSelectionSourcesForSource,
  getLayerGroupIdForLayer,
  getLayersForSource,
  getVisibleLayerGroups,
  isMatchingSource,
  findSourceOptsById,
  fetchFeaturesByIds,
} from '#/common/utils/map'
import type { MapStoreHelpers, MapStateCreator } from './mapStore'

const IS_DEV = process.env.NODE_ENV === 'development'

export type MapFeatureVars = {
  activePopupData: PopupData[]
  selectedFeatures: MapGeoJSONFeature[]
  _joinedSelectionSourceMap: SelectionSource[][]
}

export type MapFeatureActions = {
  setSelectedFeatures: (
    features: MapGeoJSONFeature[],
    updateDrawSelect?: boolean
  ) => void
  setSelectedFeaturesByClick: (features: MapGeoJSONFeature[]) => void
  _getAdditionalSelectedFeatures: (
    features: MapGeoJSONFeature[]
  ) => MapGeoJSONFeature[]
  _setPopupDataForFeatures: (features: ExtendedMapGeoJSONFeature[]) => void
  removeSelectedFeatures: (params: {
    features: MapGeoJSONFeature[]
    updateDrawSelect?: boolean
    ignorePopups?: boolean
    ignoreAdditionalFeatures?: boolean
  }) => void
  removeSelectedFeaturesByIds: (params: {
    featureIds: (string | number | undefined)[]
    source: SelectionSource
    idField?: string
    updateDrawSelect?: boolean
    ignorePopups?: boolean
  }) => void
  addSelectedFeaturesByIds: (params: {
    featureIds: (string | number | undefined)[]
    idField: string
    source: SelectionSource
    updateDrawSelect?: boolean
    ignorePopups?: boolean
    ignoreAdditionalFeatures?: boolean
    removeOtherFeatures?: boolean | 'useLayerOption'
  }) => void
  _setActivePopupData: (activePopupData: PopupData) => void
}

export type MapFeatureSlice = MapFeatureVars & MapFeatureActions

export const createMapFeatureSlice: (
  helpers: MapStoreHelpers
) => MapStateCreator<MapFeatureSlice> = (_helpers) => (set, get) => {
  const vars: MapFeatureVars = {
    activePopupData: [],
    selectedFeatures: [],
    _joinedSelectionSourceMap: [],
  }

  const actions: MapFeatureActions = {
    setSelectedFeatures: (
      features: MapGeoJSONFeature[],
      updateDrawSelect?: boolean
    ) => {
      const {
        selectedFeatures,
        _drawOptions,
        _updateDrawSelectedFeatures,
        _layerGroups,
      } = get()
      const _map = useMapInstanceStore.getState()._map

      if (isEqual(features, selectedFeatures)) {
        return
      }

      const keptFeatures = []

      const featureIdsBySource: {
        ids: Set<string | number | undefined>
        source: string
        sourceLayer?: string
      }[] = []

      for (const feature of features) {
        // Check if the feature is already selected
        const selectedFeature = selectedFeatures.find((f) => {
          if (feature.sourceLayer) {
            return (
              f.id === feature.id &&
              f.source === feature.source &&
              f.sourceLayer === feature.sourceLayer
            )
          }
          return f.id === feature.id && f.source === feature.source
        })

        // if feature is already selected
        if (selectedFeature != null) {
          keptFeatures.push(selectedFeature)
          // if feature is not yet in selected features
        } else {
          _map?.setFeatureState(
            {
              source: feature.source,
              id: feature.id,
              ...(feature.sourceLayer
                ? { sourceLayer: String(feature.sourceLayer) }
                : {}),
            },
            { selected: true }
          )
        }

        // group feature ids by source and sourceLayer, to set layer filters later
        if (
          featureIdsBySource.find((f) => isMatchingSource(f, feature)) == null
        ) {
          featureIdsBySource.push({
            source: feature.source,
            sourceLayer: feature.sourceLayer,
            ids: new Set(),
          })
        }

        featureIdsBySource
          .find((f) => isMatchingSource(f, feature))
          ?.ids.add(feature.id)
      }

      for (const selectedFeature of selectedFeatures) {
        if (!keptFeatures.includes(selectedFeature)) {
          if (_map?.getSource(selectedFeature.source)) _map.setFeatureState(
            {
              source: selectedFeature.source,
              id: selectedFeature.id,
              ...(selectedFeature.sourceLayer
                ? { sourceLayer: String(selectedFeature.sourceLayer) }
                : {}),
            },
            { selected: false }
          )

          // add empty sets for sources that are no longer selected, to update filters later
          if (
            featureIdsBySource.find((f) =>
              isMatchingSource(f, selectedFeature)
            ) == null
          ) {
            featureIdsBySource.push({
              source: selectedFeature.source,
              sourceLayer: selectedFeature.sourceLayer,
              ids: new Set(),
            })
          }
        }
      }

      set({
        selectedFeatures: features,
      })
      if (IS_DEV) {
        console.log('DEV DEBUG: Set selected features', features)
      }

      // update the map filters, because some layer styling cannot use feature state
      for (const item of featureIdsBySource) {
        const layers = getLayersForSource(
          { source: item.source, sourceLayer: item.sourceLayer },
          _layerGroups
        )
        for (const layer of layers) {
          if (['selected', 'hover-or-selected'].includes(layer.activeOn)) {
            _map?.setFilter(layer.id, [
              'in',
              ['get', 'id'],
              ['literal', Array.from(item.ids)],
            ])
          }
        }
      }

      if (updateDrawSelect) {
        if (_drawOptions.isEnabled && getActiveDrawInstance() != null) {
          _updateDrawSelectedFeatures()
        }
      }
    },

    setSelectedFeaturesByClick: (features: MapGeoJSONFeature[]) => {
      const {
        selectedFeatures,
        setSelectedFeatures,
        _drawOptions,
        _layerGroups,
        _getAdditionalSelectedFeatures,
        _setPopupDataForFeatures,
      } = get()

      if (features.length === 0) {
        return
      }

      const filterSelectedFeatures = (
        layerOptionsObj: LayerOptionsObj,
        activeLayerIds: string[],
        selectedFeatures: MapGeoJSONFeature[],
        newlySelectedFeatures: MapGeoJSONFeature[],
        layerGroups: LayerGroups
      ) => {
        const selectableLayers = Object.keys(
          pickBy(layerOptionsObj, (value: LayerOptions, _key: string) => {
            return value.selectable
          })
        )

        // remove features from unselectable layers
        let filteredFeatures = newlySelectedFeatures.filter(
          (f) =>
            selectableLayers.includes(f.layer.id) &&
            activeLayerIds.includes(f.layer.id)
        )

        // since feature selection works by source basis, filter
        // out duplicate features from different layers but same source
        filteredFeatures = uniqBy(
          filteredFeatures,
          (feature: MapGeoJSONFeature) => {
            if (feature.sourceLayer) {
              return JSON.stringify([feature.source, feature.sourceLayer, feature.id])
            } else {
              return `s-${feature.id}-${feature.source}`
            }
          }
        )

        // filter out features that are not in the active draw group, if there is one
        if (
          _drawOptions != null &&
          _drawOptions.isEnabled &&
          getActiveDrawInstance() != null &&
          _drawOptions.layerGroupId != null
        ) {
          const drawLayerGroupId = _drawOptions.layerGroupId
          filteredFeatures = filteredFeatures.filter(
            (f) =>
              getLayerGroupIdForLayer(f.layer.id, layerGroups) !==
              drawLayerGroupId
          )
        }

        // remove reatures without an id and log an error
        filteredFeatures = filteredFeatures.filter((f) => {
          if (f.id == null) {
            console.error(
              'Feature without id on layer "',
              f.layer.id,
              '". Check that the source style has either "generateId" or "promoteId" set.'
            )
            return false
          }
          return true
        })

        if (filteredFeatures.length === 0) {
          return null
        }

        // only keep the topmost feature
        const filteredFeature = filteredFeatures[0]

        let selectedFeaturesCopy = [...selectedFeatures]
        const additionalFeatures = _getAdditionalSelectedFeatures([
          filteredFeature,
        ])

        // go through filtered features and compare them to previously selected features
        const layerId = filteredFeature.layer.id

        // if the feature is already selected, unselect
        // also remove features from additional selection sources
        let foundExisting = false
        selectedFeaturesCopy = selectedFeaturesCopy.filter((f) => {
          for (const additionalFeature of additionalFeatures) {
            if (
              f.id === additionalFeature.id &&
              f.source === additionalFeature.source
            ) {
              if (
                additionalFeature.sourceLayer &&
                f.sourceLayer &&
                additionalFeature.sourceLayer === f.sourceLayer
              ) {
                foundExisting = true
                return false
              }
            }
          }
          if (f.id === filteredFeature.id && isMatchingSource(f, filteredFeature)) {
            foundExisting = true
            return false
          }
        })

        // i.e. a feature was clicked that was not already selected
        if (!foundExisting) {
          // remove all other selections
          if (selectedFeaturesCopy.length > 0) {
            if (!layerOptionsObj[layerId].multiSelectable) {
              selectedFeaturesCopy = []
            } else {
              selectedFeaturesCopy = selectedFeaturesCopy.filter((f) => {
                if (f.source === filteredFeature.source) {
                  if (!f.sourceLayer && !filteredFeature.sourceLayer) {
                    return true
                  }
                  if (f.sourceLayer === filteredFeature.sourceLayer) {
                    return true
                  }
                  return false
                }
              })
            }
          }

          selectedFeaturesCopy = [
            ...selectedFeaturesCopy,
            filteredFeature,
            ...additionalFeatures,
          ]
        }

        return selectedFeaturesCopy
      }

      const layerOptionsObj = getAllLayerOptionsObj(_layerGroups)
      const visibleLayerGroups = getVisibleLayerGroups(_layerGroups)

      let activeLayerIds: string[] = []
      for (const layerGroupId of Object.keys(visibleLayerGroups)) {
        const layerGroup = visibleLayerGroups[layerGroupId]
        activeLayerIds = [...activeLayerIds, ...Object.keys(layerGroup.layers)]
      }

      const filteredSelectedFeatures = filterSelectedFeatures(
        layerOptionsObj,
        activeLayerIds,
        selectedFeatures,
        features,
        _layerGroups
      )

      if (filteredSelectedFeatures == null) {
        return
      }

      setSelectedFeatures(filteredSelectedFeatures)
      _setPopupDataForFeatures(filteredSelectedFeatures)
    },

    // if the layerConf specifies other sources that have the same features (with the same ids), these
    // are queried here and returned
    _getAdditionalSelectedFeatures: (features: MapGeoJSONFeature[]) => {
      const { _layerGroups, _joinedSelectionSourceMap } = get()
      const _map = useMapInstanceStore.getState()._map

      const additionalFeatures: MapGeoJSONFeature[] = []

      // in progress: create helper util to fetch joined sources map

      for (const feature of features) {
        const sourceOptions = findSourceOptsById(feature.source, _layerGroups)

        const additionalSelectionSources = getJoinedSelectionSourcesForSource({
          joinedSelectionSourceMap: _joinedSelectionSourceMap,
          source: feature.source,
          sourceLayer: feature.sourceLayer,
        })

        if (additionalSelectionSources != null) {
          for (const additionalSource of additionalSelectionSources) {
            const features = fetchFeaturesByIds({
              ids: [feature.id],
              source: additionalSource,
              map: _map,
            })

            additionalFeatures.push(...features)
          }
        }
      }

      return additionalFeatures
    },

    _setPopupDataForFeatures: (features: ExtendedMapGeoJSONFeature[]) => {
      if (features == null || features.length === 0) {
        set((draft) => {
          draft.activePopupData = []
        })

        return
      }

      const { _layerGroups, activePopupData } = get()

      const layerOptionsObj = getAllLayerOptionsObj(_layerGroups)

      const popupDatas: PopupData[] = []

      // filter features that have popup options
      // add the popup option to feature here for efficiency
      const featurePopupOpts: {
        feature: MapGeoJSONFeature
        popupOpts: PopupOpts
      }[] = features.reduce<
        {
          feature: MapGeoJSONFeature
          popupOpts: PopupOpts
        }[]
      >((acc, feature) => {
        if (feature.isPlaceholder) {
          return acc // Skip placeholder features
        }

        let popupOpts: PopupOpts | null = null

        if (feature.layer == null) {
          const source = findSourceOptsById(feature.source, _layerGroups)
          if (
            source &&
            source.popupOpts != null &&
            isMatchingSource(source.popupOpts, feature)
          ) {
            popupOpts = source.popupOpts
          }
        } else {
          const layerOptions = layerOptionsObj[feature.layer.id]
          if (layerOptions && layerOptions.popupOpts != null) {
            popupOpts = layerOptions.popupOpts
          }
        }

        if (popupOpts) {
          acc.push({ feature, popupOpts })
        }

        return acc
      }, [])

      for (const featurePopupOpt of featurePopupOpts) {
        const popupData: PopupData = {
          features: featurePopupOpts.map((fp) => fp.feature),
          ...featurePopupOpt.popupOpts,
        }

        popupDatas.push(popupData)

        if (!popupData.multiPoppable) {
          // TODO: figure out logic for multiple popups, if needed
          break
        }
      }

      // if there is new and old popup data, check if they are the same
      if (activePopupData.length > 0 && popupDatas.length > 0) {
        const newPopupData = popupDatas[0]
        const oldPopupData = activePopupData[0]

        if (
          isMatchingSource(newPopupData, oldPopupData) &&
          newPopupData.component === oldPopupData.component &&
          isEqual(newPopupData.componentProps, oldPopupData.componentProps)
        ) {
          if (isEqual(newPopupData.features, oldPopupData.features)) {
            return
          }
          // if the features are different or in different order, update the popup data
          set((draft) => {
            const activePopupData = (draft as unknown as MapFeatureVars)
              .activePopupData
            activePopupData[0].features = newPopupData.features
          })

          return
        }
      }

      set({
        activePopupData: popupDatas,
      })
    },

    removeSelectedFeatures: (params: {
      features: MapGeoJSONFeature[]
      ignoreAdditionalFeatures?: boolean
      updateDrawSelect?: boolean
      ignorePopups?: boolean
    }) => {
      const {
        features,
        ignoreAdditionalFeatures,
        updateDrawSelect,
        ignorePopups,
      } = params
      const {
        selectedFeatures,
        setSelectedFeatures,
        _setPopupDataForFeatures,
        _getAdditionalSelectedFeatures,
      } = get()

      let featuresToRemove = features

      if (!ignoreAdditionalFeatures) {
        // get additional features for the selected features
        const additionalFeatures = _getAdditionalSelectedFeatures(features)
        featuresToRemove = [...features, ...additionalFeatures]
      }

      const newSelectedFeatures = selectedFeatures.filter((sf) => {
        const isPresentInParamsFeatures = featuresToRemove.some((pf) => {
          return pf.id === sf.id && isMatchingSource(sf, pf)
        })

        return !isPresentInParamsFeatures
      })

      setSelectedFeatures(newSelectedFeatures, updateDrawSelect)

      if (!ignorePopups) {
        _setPopupDataForFeatures(newSelectedFeatures)
      }
    },

    removeSelectedFeaturesByIds: (params: {
      featureIds: (string | number | undefined)[]
      source: SelectionSource
      idField?: string
      updateDrawSelect?: boolean
      ignorePopups?: boolean
    }) => {
      const {
        featureIds,
        source,
        idField = 'id',
        updateDrawSelect,
        ignorePopups,
      } = params
      const {
        selectedFeatures,
        setSelectedFeatures,
        _setPopupDataForFeatures,
      } = get()

      const newSelectedFeatures = selectedFeatures.filter((feature) => {
        if (!isMatchingSource(feature, source)) {
          return true
        }

        const featureId = feature.properties?.[idField]
        if (featureId != null) {
          return !featureIds.includes(featureId.toString())
        }

        return true
      })

      setSelectedFeatures(newSelectedFeatures, updateDrawSelect)

      if (!ignorePopups) {
        _setPopupDataForFeatures(newSelectedFeatures)
      }
    },

    addSelectedFeaturesByIds: (params: {
      featureIds: (string | number | undefined)[]
      idField: string
      source: SelectionSource
      updateDrawSelect?: boolean
      ignorePopups?: boolean
      ignoreAdditionalFeatures?: boolean
      removeOtherFeatures?: boolean | 'useLayerOption'
    }) => {
      const {
        featureIds,
        idField,
        source,
        updateDrawSelect = false,
        ignorePopups = false,
        ignoreAdditionalFeatures = false,
        removeOtherFeatures = 'useLayerOption',
      } = params

      const {
        setSelectedFeatures,
        _setPopupDataForFeatures,
        _getAdditionalSelectedFeatures,
        selectedFeatures,
        _joinedSelectionSourceMap,
      } = get()
      const _map = useMapInstanceStore.getState()._map

      const newFeatures = fetchFeaturesByIds({
        ids: featureIds,
        source: source,
        idField: idField,
        map: _map,
      })

      const oldFeatures: MapGeoJSONFeature[] = []

      if (removeOtherFeatures === false) {
        oldFeatures.push(...selectedFeatures)
      } else if (removeOtherFeatures === 'useLayerOption') {
        const sourceOptions = findSourceOptsById(
          source.source,
          get()._layerGroups
        )

        if (sourceOptions?.extendedOpts?.multiSelectable) {
          const joinedSelectionSources = getJoinedSelectionSourcesForSource({
            joinedSelectionSourceMap: _joinedSelectionSourceMap,
            source: source.source,
            sourceLayer: source.sourceLayer,
          })
          const matchingFeatures = selectedFeatures.filter((f) => {
            ;[...joinedSelectionSources, source].some((js) => {
              isMatchingSource(f, js)
            })
          })
          oldFeatures.push(...matchingFeatures)
        }
      }

      if (!ignoreAdditionalFeatures) {
        const additionalFeatures = _getAdditionalSelectedFeatures(newFeatures)
        newFeatures.push(...additionalFeatures)
      }

      setSelectedFeatures(
        uniq([...oldFeatures, ...newFeatures]),
        updateDrawSelect
      )

      if (!ignorePopups) {
        _setPopupDataForFeatures(newFeatures)
      }
    },

    _setActivePopupData: (activePopupData: PopupData) => {
      set(
        produce((state) => {
          state.activePopupData = activePopupData
        })
      )
    },
  }

  return { ...vars, ...actions }
}
