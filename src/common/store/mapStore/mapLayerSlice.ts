import { map, cloneDeep, uniq, isEqual } from 'lodash-es'
import turfBbox from '@turf/bbox'
import mapboxgl from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type {
  GeoJSONSource,
  LngLatBounds,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl'
import { useMapInstanceStore } from './mapInstanceStore'
import { geoserverJsonQuery } from '#/common/queries/geoserverJsonQuery'
import {
  LayerGroupId,
  LayerOptions,
  LayerGroupOptions,
  LayerGroupAddOptions,
  SerializableLayerGroupAddOptions,
  LayerGroupAddOptionsWithConf,
  QueueOptions,
  LayerGroups,
  ImageOptions,
  SourceOptions,
  ExtendedSourceSpecification,
  isStandardSourceOptions,
  SearchableDataOpts,
  DataSearchOpts,
  LayerOrderLevel,
  ListedLayerMenuItem,
  QueuePriority,
  SelectionSource,
} from '#/common/types/map'
import {
  getLayerName,
  resolveMbStyle,
  findSourceOptsById,
  encodeUrlWithParams,
  applyCanvasFillPattern,
  findFirstMatchingLayer,
  findLastMatchingLayer,
  addLayerAfter,
  addLayerByOrderLevel,
  getSourceJson,
  isMatchingSource,
} from '#/common/utils/map'
import { flattenLayerBackedListedLayerItems } from '#/common/utils/listedLayerGroups'
import type { MapStoreHelpers, MapStateCreator } from './mapStore'

let imageRenderCanvas: HTMLCanvasElement | null = null
let imageRenderCtx: CanvasRenderingContext2D | null = null
const imageRenderSize = 24

export type MapLayerVars = {
  searchableDatas: Record<string, SearchableDataOpts>
  listedLayerGroups: ListedLayerMenuItem[]
  _images: Record<string, ImageOptions>
  _layerGroups: LayerGroups
  _layerInstances: Record<string, LayerSpecification>
  _layerGroupIdsBeingProcessed: Set<string>
  _staleSourceIds: string[]
  _dataSyncSubscriptions: Record<string, Record<string, () => void>>
  _persistingLayerGroupAddOptions: Record<
    string,
    SerializableLayerGroupAddOptions
  >
}

export type MapLayerActions = {
  getSourceBounds: (
    sourceId: string,
    _queueOptions?: QueueOptions
  ) => Promise<LngLatBounds | null>
  getSourceJsonAsyncQueue: (
    id: string,
    _queueOptions?: QueueOptions
  ) => Promise<FeatureCollection | null>
  setListedLayerGroups: (
    listedLayerGroups: ListedLayerMenuItem[],
    resetVisibility?: boolean,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  addLayerGroup: (
    layerGroupId: LayerGroupId | string,
    options: LayerGroupAddOptions | SerializableLayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  enableLayerGroup: (
    layerGroupId: LayerGroupId | string,
    options?: LayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  disableLayerGroup: (layerGroupId: LayerGroupId | string) => Promise<void>
  removeLayerGroup: (layerGroupId: LayerGroupId | string) => Promise<void>
  toggleLayerGroup: (
    layerGroupId: LayerGroupId | string,
    options: LayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  addSerializableLayerGroup: (
    layerGroupIdString: string,
    options: SerializableLayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  toggleSerializableLayerGroup: (
    layerGroupIdString: string,
    options: SerializableLayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  enableSerializableLayerGroup: (
    layerGroupIdString: string,
    options: SerializableLayerGroupAddOptions,
    _queueOptions?: QueueOptions
  ) => Promise<void>
  disableSerializableLayerGroup: (layerGroupIdString: string) => Promise<void>
  removeSerializableLayerGroup: (layerGroupIdString: string) => Promise<void>
  addImage: (
    id: string,
    layerGroupId: string,
    svgString: string,
    colorCode?: string,
    size?: number
  ) => Promise<void>
  updateSourceData: (layerGroupId: string, data: FeatureCollection) => void
  _setGroupVisibility: (
    layerGroupId: LayerGroupId | string,
    isVisible: boolean
  ) => void
  _addStaleSourceId: (id: string) => void
  _refreshStaleSources: () => Promise<void>
  _addStyle: (
    id: LayerGroupId | string,
    options: LayerGroupAddOptionsWithConf
  ) => Promise<void>
  _enableLayerGroupEventHandlers: (layerGroupId: string) => void
  _disableLayerGroupEventHandlers: (layerGroupId: string) => void
  _runLayerGroupActivationActions: (
    layerGroupIdString: string,
    opts?: LayerGroupAddOptions | SerializableLayerGroupAddOptions
  ) => Promise<void>
  _addPersistingLayerGroupAddOptions: (
    id: string,
    options: SerializableLayerGroupAddOptions
  ) => void
  _removePersistingLayerGroupAddOptions: (id: string) => void
}

export type MapLayerSlice = MapLayerVars & MapLayerActions

export const createMapLayerSlice: (
  helpers: MapStoreHelpers
) => MapStateCreator<MapLayerSlice> = (helpers) => (set, get) => {
  const vars: MapLayerVars = {
    searchableDatas: {},
    listedLayerGroups: [],
    _images: {},
    _layerGroups: {},
    _layerInstances: {},
    _layerGroupIdsBeingProcessed: new Set(),
    _staleSourceIds: [],
    _dataSyncSubscriptions: {},
    _persistingLayerGroupAddOptions: {},
  }

  const actions: MapLayerActions = {
    getSourceBounds: helpers.queueableFnInit(
      async (sourceId: string): Promise<LngLatBounds | null> => {
        // Query source features for the specified source
        try {
          const { getSourceJsonAsyncQueue } = get()
          const _map = useMapInstanceStore.getState()._map

          if (!_map) {
            return null
          }

          let featureColl: FeatureCollection | null = null

          const sourceFeatures = await getSourceJsonAsyncQueue(sourceId, {
            skipQueue: true,
          })

          if (sourceFeatures) {
            featureColl = sourceFeatures
          } else {
            const features = _map?.querySourceFeatures(sourceId)

            if (features.length > 0 && features[0].geometry) {
              featureColl = {
                type: 'FeatureCollection',
                features: features,
              }
            } else {
              const source = _map?.getSource(sourceId)
              // TODO: check the method of finding the set extent of a source in style. This method is probably deprecated.
              //@ts-ignore
              if (source && source.tileBounds && source.tileBounds.bounds) {
                //@ts-ignore
                return source.tileBounds.bounds
              }
            }
          }

          if (!featureColl) {
            return null
          }

          const bbox = turfBbox(featureColl)

          if (bbox.includes(Infinity) || bbox.includes(-Infinity)) {
            return null
          }
          // Convert Turf.js bbox to Mapbox LngLatBounds
          const bounds = new mapboxgl.LngLatBounds(
            [bbox[0], bbox[1]], // [west, south] or [minX, minY]
            [bbox[2], bbox[3]] // [east, north] or [maxX, maxY]
          )

          return bounds
        } catch (e) {
          console.error("Couldn't get source bounds")
          console.error(e)
          return null
        }
      },
      { key: 'getSourceBounds', priority: QueuePriority.LOW }
    ),

    getSourceJsonAsyncQueue: helpers.queueableFnInit(
      async (id: string): Promise<FeatureCollection | null> => {
        const _map = useMapInstanceStore.getState()._map
        return await getSourceJson(id, _map)
      },
      { key: 'getSourceJsonAsyncQueue', priority: QueuePriority.LOW }
    ),

    setListedLayerGroups: helpers.queueableFnInit(
      async (
        listedLayerGroups: ListedLayerMenuItem[],
        resetVisibility?: boolean
      ) => {
        const {
          listedLayerGroups: oldListedLayerGroups,
          _layerGroups,
          removeLayerGroup,
          addLayerGroup,
          enableLayerGroup,
        } = get()

        const oldLayerBackedItems =
          flattenLayerBackedListedLayerItems(oldListedLayerGroups)
        const layerBackedItems =
          flattenLayerBackedListedLayerItems(listedLayerGroups)
        const oldVisibleIds: string[] = []

        for (const oldLg of oldLayerBackedItems) {
          if (_layerGroups[oldLg.id] == null) {
            continue
          }
          if (!layerBackedItems.some((lg) => lg.id === oldLg.id)) {
            await removeLayerGroup(oldLg.id)
          } else {
            // if there are previously visible background layers, keep them visible
            if (!resetVisibility && !_layerGroups[oldLg.id].isHidden) {
              oldVisibleIds.push(oldLg.id)
            }
          }
        }

        for (const lg of layerBackedItems) {
          const oldLg = oldLayerBackedItems.find((old) => old.id === lg.id)
          if (oldLg == null || _layerGroups[oldLg.id] == null) {
            // if there are old visible ids, then overwrite visibility of the addOptions
            if (
              oldVisibleIds.length > 0 &&
              lg.addOptions.layerOrderOptions.disableOthersInGroup
            ) {
              await addLayerGroup(
                lg.id,
                { ...lg.addOptions, isHidden: true },
                { skipQueue: true }
              )
            } else {
              await addLayerGroup(lg.id, lg.addOptions, { skipQueue: true })
            }
          } else {
            if (oldVisibleIds.length === 0) {
              if (_layerGroups[oldLg.id].isHidden && !lg.addOptions.isHidden) {
                // if there are no enabled background layers and the old layer group was
                // hidden, but the new one is not, then enable it
                await enableLayerGroup(oldLg.id, lg.addOptions)
              }
            }
          }
        }

        set({ listedLayerGroups: listedLayerGroups })
      },
      { key: 'setListedLayerGroups', priority: QueuePriority.MEDIUM_HIGH }
    ),

    addImage: helpers.queueableFnInit(
      async (
        id: string,
        layerGroupId: string,
        svgString: string,
        colorCode?: string,
        size: number = imageRenderSize
      ) => {
        const _map = useMapInstanceStore.getState()._map
        if (!_map) {
          console.error('Map not initialized')
          return
        }

        if (!imageRenderCanvas && typeof document !== 'undefined') {
          imageRenderCanvas = document.createElement('canvas')
          imageRenderCtx = imageRenderCanvas.getContext('2d')
        }

        if (!imageRenderCanvas || !imageRenderCtx) {
          console.error(
            'Canvas context could not be initialized (not in browser?)'
          )
          return
        }

        // Ensure canvas has the correct size for this specific image
        if (
          imageRenderCanvas.width !== size ||
          imageRenderCanvas.height !== size
        ) {
          imageRenderCanvas.width = size
          imageRenderCanvas.height = size
        }

        const ctx = imageRenderCtx

        if (_map.hasImage(id)) {
          _map.removeImage(id)
        }

        // Adjust canvas size if necessary for this specific image
        if (
          imageRenderCanvas.width !== size ||
          imageRenderCanvas.height !== size
        ) {
          imageRenderCanvas.width = size
          imageRenderCanvas.height = size
        }

        const img = new Image()
        img.onload = () => {
          ctx.clearRect(0, 0, size, size)
          ctx.drawImage(img, 0, 0, size, size)
          const imageData = ctx.getImageData(0, 0, size, size)

          if (!_map.hasImage(id)) {
            _map.addImage(id, imageData)

            set((state) => {
              const imageOptions: ImageOptions = {
                id,
                layerGroupId,
                size,
                ...(colorCode && { colorCode }),
              }
              state._images[id] = imageOptions
            })
          }
        }
        img.onerror = (err) => {
          /* ... error handling ... */
        }
        img.src =
          'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString)
      },
      { key: 'addImage', priority: QueuePriority.HIGH }
    ),

    // TODO: The logic of this function is getting too complex. Now we have
    // LayerConfs fetched from the common storage and LayerConfs supplied by the calling
    // component. Solution:
    // make "options" mandatory, and always supply a layerConf from the calling function.
    addLayerGroup: helpers.queueableFnInit(
      async (
        layerGroupId: string,
        options: LayerGroupAddOptions | SerializableLayerGroupAddOptions
      ) => {
        // The caller can unmount while this operation waits for map readiness.
        if (options && 'isCurrent' in options && options.isCurrent?.() === false)
          return
        const {
          _addStyle,
          _persistingLayerGroupAddOptions,
          _addPersistingLayerGroupAddOptions,
          mapContext,
          _runLayerGroupActivationActions,
          _layerGroupIdsBeingProcessed,
        } = get()

        if (_layerGroupIdsBeingProcessed.has(layerGroupId)) {
          console.warn(
            `Layer group "${layerGroupId}" is already being processed. Skipping addLayerGroup call.`
          )
          return
        }

        set((state) => {
          state._layerGroupIdsBeingProcessed.add(layerGroupId)
        })

        try {
          // Initialize layer if it doesn't exist
          let opts = cloneDeep(options) || {
            persist: false,
            layerConf: undefined,
          }

          if (opts.mapContext == null) {
            opts.mapContext = mapContext
          }

          if (opts.mapContext !== mapContext) {
            opts.isHidden = true
          }

          if (opts.persist) {
            _addPersistingLayerGroupAddOptions(layerGroupId, opts)
          }

          if (!opts.layerConf) {
            if (_persistingLayerGroupAddOptions[layerGroupId] != null) {
              opts = cloneDeep(_persistingLayerGroupAddOptions[layerGroupId])
            }
            // else {
            //   opts.layerConf = layerConfs.find((el: LayerConf) => {
            //     return el.id === layerGroupId
            //   })
            // }
          }

          if (opts.layerConf) {
            await _addStyle(layerGroupId, opts as LayerGroupAddOptionsWithConf)

            if ('isCurrent' in opts && opts.isCurrent?.() === false) return

            // Add event listener for source data changes

            await _runLayerGroupActivationActions(layerGroupId, opts)
          } else {
            console.error('No layer config found for id: ' + layerGroupId)
          }
        } finally {
          set((state) => {
            state._layerGroupIdsBeingProcessed.delete(layerGroupId)
          })
        }
      },
      { key: 'addLayerGroup', priority: QueuePriority.MEDIUM_HIGH }
    ),

    enableLayerGroup: async (
      layerGroupId: LayerGroupId | string,
      options?: LayerGroupAddOptions
    ) => {
      const {
        _layerGroups,
        _setGroupVisibility,
        addLayerGroup,
        _runLayerGroupActivationActions,
      } = get()

      if (_layerGroups[layerGroupId]) {
        _setGroupVisibility(layerGroupId, true)
        _runLayerGroupActivationActions(layerGroupId, options)
      } else {
        if (!options) {
          throw new Error(
            'Unable to enable layer group without layer group options: ' +
              layerGroupId
          )
        }
        addLayerGroup(layerGroupId, options)
      }

      if (options?.layerOrderOptions?.disableOthersInGroup) {
        // Disable all other layer groups with the same order level
        const { disableLayerGroup } = get()
        const orderLevel = options.layerOrderOptions.layerOrderLevel

        for (const otherLayerGroupId in _layerGroups) {
          if (otherLayerGroupId !== layerGroupId) {
            const otherLayerGroup = _layerGroups[otherLayerGroupId]
            if (
              otherLayerGroup.orderLevel === orderLevel &&
              !otherLayerGroup.isHidden
            ) {
              disableLayerGroup(otherLayerGroupId)
            }
          }
        }
      }
    },

    disableLayerGroup: async (layerGroupId: LayerGroupId | string) => {
      const {
        _setGroupVisibility,
        _layerGroups,
        _drawOptions,
        _removeDraw,
        setSelectedFeatures,
        selectedFeatures,
        searchableDatas,
      } = get()

      if (!Object.keys(_layerGroups).includes(layerGroupId)) {
        throw new Error(
          "Unable to disable layer group that isn't enabled: " + layerGroupId
        )
      }

      _setGroupVisibility(layerGroupId, false)
      const layerGroup = _layerGroups[layerGroupId]
      const sources = uniq(map(layerGroup.layers, 'source'))

      setSelectedFeatures(
        selectedFeatures.filter((f) => !sources.includes(f.source))
      )

      if (searchableDatas[layerGroupId]) {
        set((state) => {
          state.searchableDatas[layerGroupId].enabled = false
        })
      }

      if (_drawOptions.layerGroupId === layerGroupId) {
        _removeDraw({ skipQueue: true })
      }
    },

    removeLayerGroup: async (layerGroupId: LayerGroupId | string) => {
      const {
        _layerGroups,
        _drawOptions,
        _removeDraw,
        _images,
        _updateSelectableHoverHandlers,
        _dataSyncSubscriptions,
        searchableDatas,
      } = get()
      const _map = useMapInstanceStore.getState()._map

      if (!Object.keys(_layerGroups).includes(layerGroupId)) {
        console.warn(
          'Unable to remove layer group that does not have layer group options: ' +
            layerGroupId
        )
        return
      }

      const layerGroupOptions = _layerGroups[layerGroupId]

      // Remove all layers of this group
      for (const layerId of Object.keys(layerGroupOptions.layers)) {
        if (_map?.getLayer(layerId)) {
          _map.removeLayer(layerId)
        }
      }

      // Remove all unique sources used by this group
      // Prefer the group's own source registry; fallback to sources referenced by layer options.
      const sourceIdsInGroup = new Set<string>(
        Object.keys(layerGroupOptions.sources)
      )
      for (const layerId of Object.keys(layerGroupOptions.layers)) {
        const src = layerGroupOptions.layers[layerId]?.source
        if (src) sourceIdsInGroup.add(src)
      }

      for (const sourceId of sourceIdsInGroup) {
        if (_map?.getSource(sourceId)) {
          try {
            _map.removeSource(sourceId)
          } catch (e) {
            console.warn(`Failed to remove source "${sourceId}"`, e)
          }
        }
      }

      // 3) Wait for a style tick so MapLibre finalizes removals before next add
      await new Promise<void>((resolve) => {
        const map = useMapInstanceStore.getState()._map
        if (!map) return resolve()
        let done = false
        const finish = () => {
          if (done) return
          done = true
          resolve()
        }
        try {
          map.once('styledata', finish)
        } catch {
          // ignore
        }
        if (
          typeof window !== 'undefined' &&
          'requestAnimationFrame' in window
        ) {
          requestAnimationFrame(finish)
        } else {
          setTimeout(finish, 0)
        }
      })

      // Detach data handler (if any)
      if (layerGroupOptions.handleDataUpdate) {
        _map?.off('sourcedata', layerGroupOptions.handleDataUpdate)
      }

      // Clean searchableDatas entry
      if (searchableDatas[layerGroupId]) {
        set((state) => {
          delete state.searchableDatas[layerGroupId]
        })
      }

      // Unsubscribe store syncs
      if (_dataSyncSubscriptions[layerGroupId]) {
        Object.values(_dataSyncSubscriptions[layerGroupId]).forEach(
          (unsubscribe) => unsubscribe()
        )
      }

      // Remove any images tied to this group
      Object.keys(_images).forEach((imageId) => {
        const image = _images[imageId]
        if (image.layerGroupId === layerGroupId) {
          _map?.removeImage(imageId)
        }
      })

      // Clear state for this group (images, layerInstances, joined selection sources, etc.)
      set((state) => {
        // purge images metadata
        for (const imageId in state._images) {
          if (state._images[imageId].layerGroupId === layerGroupId) {
            delete state._images[imageId]
          }
        }
        // remove any joined selection entries that reference these sources
        const sourceIdsToRemove = Object.keys(layerGroupOptions.sources)
        if (sourceIdsToRemove.length > 0) {
          state._joinedSelectionSourceMap =
            state._joinedSelectionSourceMap.filter((joinedArray) => {
              const hasMatchingSource = joinedArray.some((selectionSource) =>
                sourceIdsToRemove.includes(selectionSource.source)
              )
              return !hasMatchingSource // Keep the array if it does NOT have a matching source
            })
        }

        // finally drop the group and subscriptions
        delete state._layerGroups[layerGroupId]
        delete state._dataSyncSubscriptions[layerGroupId]
      })

      // 9) Remove draw if it was tied to this group
      if (_drawOptions.layerGroupId === layerGroupId) {
        await _removeDraw({ skipQueue: true })
      }

      _updateSelectableHoverHandlers()
    },

    toggleLayerGroup: async (
      layerGroupId: LayerGroupId | string,
      options: LayerGroupAddOptions
    ) => {
      const { disableLayerGroup, enableLayerGroup, _layerGroups } = get()

      if (_layerGroups[layerGroupId] && !_layerGroups[layerGroupId].isHidden) {
        await disableLayerGroup(layerGroupId)
      } else {
        await enableLayerGroup(layerGroupId, options)
      }
    },

    // these are used used for layers with dynamic ids
    addSerializableLayerGroup: async (
      layerGroupIdString: string,
      options: SerializableLayerGroupAddOptions
    ) => {
      const { addLayerGroup } = get()

      try {
        await addLayerGroup(
          layerGroupIdString as LayerGroupId,
          options as LayerGroupAddOptions
        )
      } catch (e) {
        'Unable to add layer with id: ' + layerGroupIdString
        console.error(e)
      }
    },

    toggleSerializableLayerGroup: async (
      layerGroupIdString: string,
      options?: SerializableLayerGroupAddOptions
    ) => {
      const { toggleLayerGroup } = get()

      try {
        await toggleLayerGroup(
          layerGroupIdString as LayerGroupId,
          options as LayerGroupAddOptions
        )
      } catch (e) {
        'Unable to toggle layer with id: ' + layerGroupIdString
        console.error(e)
      }
    },

    enableSerializableLayerGroup: async (
      layerGroupIdString: string,
      options?: SerializableLayerGroupAddOptions
    ) => {
      const { enableLayerGroup } = get()

      try {
        enableLayerGroup(
          layerGroupIdString as LayerGroupId,
          options as LayerGroupAddOptions
        )
      } catch (e) {
        'Unable to enable layer with id: ' + layerGroupIdString
        console.error(e)
      }
    },

    disableSerializableLayerGroup: async (layerGroupIdString: string) => {
      const { disableLayerGroup } = get()

      await disableLayerGroup(layerGroupIdString as LayerGroupId)
    },

    removeSerializableLayerGroup: async (layerGroupIdString: string) => {
      const { removeLayerGroup } = get() // Assuming you have a map reference in your store.

      await removeLayerGroup(layerGroupIdString as LayerGroupId)
    },
    updateSourceData: (layerGroupId: string, data: FeatureCollection) => {
      const _map = useMapInstanceStore.getState()._map // Get the Mapbox map instance from the state

      const source = _map?.getSource(layerGroupId) as GeoJSONSource

      if (!source) {
        console.error('No source found with id ' + layerGroupId)
        return
      }

      if (source.type !== 'geojson') {
        console.error(
          'Cannot update data in a non-geojson source: ' + layerGroupId
        )
        return
      }

      source.setData(data)
    },
    _setGroupVisibility: (
      layerGroupId: LayerGroupId | string,
      isVisible: boolean
    ) => {
      const { _layerGroups } = get()
      const _map = useMapInstanceStore.getState()._map

      const layerGroup = _layerGroups[layerGroupId]

      for (const layerId in layerGroup.layers) {
        _map?.setLayoutProperty(
          layerId,
          'visibility',
          isVisible ? 'visible' : 'none'
        )
      }

      set((state) => {
        if (state.searchableDatas[layerGroupId]) {
          state.searchableDatas[layerGroupId].enabled = isVisible
        }
        state._layerGroups[layerGroupId].isHidden = !isVisible
      })
    },
    _addStaleSourceId: (id: string) => {
      const { _staleSourceIds } = get()
      if (!_staleSourceIds.includes(id)) {
        set((state) => {
          state._staleSourceIds.push(id)
        })
      }
    },

    _refreshStaleSources: async () => {
      const { _staleSourceIds, _layerGroups } = get()
      const _map = useMapInstanceStore.getState()._map

      const newStaleSourceIds: string[] = []

      _staleSourceIds.forEach(async (sourceId) => {
        const sourceOpts = findSourceOptsById(sourceId, _layerGroups)

        if (!sourceOpts) {
          console.warn(
            `No source options found for stale source id: ${sourceId}`
          )
          return
        }

        if (sourceOpts.type !== 'store') {
          if ('url' in sourceOpts && sourceOpts.url) {
            if (sourceOpts.type === 'geojson') {
              if (sourceOpts.extendedOpts?.ensureLocalData) {
                const fetchedData = await geoserverJsonQuery(
                  sourceOpts.url,
                  sourceOpts.extendedOpts.useAccessToken
                )
                if (fetchedData) {
                  const source = _map?.getSource(sourceOpts.id)
                  ;(source as GeoJSONSource).setData(fetchedData)
                } else {
                  newStaleSourceIds.push(sourceId)
                }
              } else {
                const source = _map?.getSource(sourceOpts.id) as GeoJSONSource
                source.setData(sourceOpts.url)
              }
            }
            _map?.refreshTiles(sourceId)
          }
          if (
            'tiles' in sourceOpts &&
            sourceOpts.tiles &&
            sourceOpts.tiles.length > 0
          ) {
            _map?.refreshTiles(sourceId)
          }
        }
      })

      set((state) => {
        state._staleSourceIds = uniq(newStaleSourceIds)
      })
    },

    _addStyle: async (
      id: LayerGroupId | string,
      options: LayerGroupAddOptionsWithConf
    ) => {
      const {
        _enableLayerGroupEventHandlers,
        _updateSelectableHoverHandlers,
        _layerGroups,
      } = get()

      if (_layerGroups[id]) {
        console.warn(
          `Layer group with id "${id}" already exists. Skipping adding it again. In react strict mode this warning is expected. Otherwise, something is probably funky.`
        )
        return
      }
      // const setIsMapPopupOpen = useUIStore.getState().setIsMapPopupOpen
      const _map = useMapInstanceStore.getState()._map

      const style = await resolveMbStyle(options.layerConf.style)
      if (options.isCurrent && !options.isCurrent()) return

      let layerInsertId: string | null = null

      let dataHasBeenAdded = false // for checking if rollback is needed

      try {
        let orderLevel: LayerOrderLevel = LayerOrderLevel.LAYER
        if (
          options?.layerOrderOptions &&
          'layerOrderLevel' in options.layerOrderOptions
        ) {
          orderLevel = options.layerOrderOptions.layerOrderLevel
        }

        let layerGroup: LayerGroupOptions = {
          isProcessing: true,
          id: id,
          mapContext: options.mapContext,
          isHidden: options.isHidden ? true : false,
          persist: options.persist ? true : false,
          orderLevel: orderLevel,
          layers: {},
          sources: {},
          eventHandlers: [],
        }

        for (const sourceKey in style.sources) {
          const { extendedOpts, ...sourceSpec } = style.sources[
            sourceKey
          ] as ExtendedSourceSpecification

          const sourceOptions: SourceOptions = {
            id: sourceKey,
            type: sourceSpec.type,
            popupOpts: null,
            layerIds: [],
            ...(extendedOpts && { extendedOpts }),
          } as SourceOptions

          if (isStandardSourceOptions(sourceOptions)) {
            // store the original urls in the sourceOptions
            if ('data' in sourceSpec && typeof sourceSpec.data === 'string') {
              sourceOptions.url = sourceSpec.data

              // if it useAccessToken is set, then the source url needs to be encoded in a such way that
              // the transformRequest knows to add the access token and can get sourceId to clear cache if needed
              if (
                sourceOptions.extendedOpts &&
                sourceOptions.extendedOpts.useAccessToken
              ) {
                sourceSpec.data = encodeUrlWithParams(sourceSpec.data, {
                  sourceId: sourceKey,
                  useAccessToken: true,
                })
              }
            } else if (
              'url' in sourceSpec &&
              typeof sourceSpec.url === 'string'
            ) {
              sourceOptions.url = sourceSpec.url

              if (
                sourceOptions.extendedOpts &&
                sourceOptions.extendedOpts.useAccessToken
              ) {
                sourceSpec.url = encodeUrlWithParams(sourceSpec.url, {
                  sourceId: sourceKey,
                  useAccessToken: true,
                })
              }
            } else if (
              'tiles' in sourceSpec &&
              Array.isArray(sourceSpec.tiles)
            ) {
              sourceOptions.tiles = sourceSpec.tiles

              if (
                sourceOptions.extendedOpts &&
                sourceOptions.extendedOpts.useAccessToken
              ) {
                sourceSpec.tiles = sourceSpec.tiles.map((tileUrl) => {
                  return encodeUrlWithParams(tileUrl, {
                    sourceId: sourceKey,
                    useAccessToken: true,
                  })
                })
              }
            }
          }

          // used for searchableData when the source type is geojson or store
          let data: FeatureCollection | undefined = undefined

          // for geojson sources
          if (
            sourceOptions.type === 'geojson' &&
            'data' in sourceSpec &&
            sourceSpec.data
          ) {
            if (typeof sourceSpec.data !== 'string') {
              data = sourceSpec.data as FeatureCollection
            }
          }

          if (sourceOptions.type === 'store') {
            const storeDataOpts = sourceOptions.extendedOpts?.storeData
            if (!storeDataOpts?.sync) {
              console.error(
                `Source "${sourceKey}" is type 'store' but is missing storeData.sync configuration.`
              )
              continue // Skip this source
            }

            const { store, selector } = storeDataOpts.sync
            const initialData = selector(store.getState())

            data = initialData || {
              type: 'FeatureCollection',
              features: [],
            }

            const parsedSourceSpec: SourceSpecification = {
              ...sourceSpec,
              type: 'geojson',
              data: data,
            }

            _map?.addSource(sourceKey, parsedSourceSpec)
            dataHasBeenAdded = true

            const unsubscribe = (store as any).subscribe(
              selector,
              (newData: FeatureCollection) => {
                const _map = useMapInstanceStore.getState()._map
                const source = _map?.getSource(sourceKey) as GeoJSONSource
                // Update the map source when the store data changes
                if (source && newData) {
                  source.setData(newData)
                }

                if (sourceOptions.extendedOpts?.dataSearchOpts) {
                  set((state) => {
                    state.searchableDatas[id].data = newData
                  })
                }
              }
            )

            // Save the unsubscribe function for later cleanup
            set((state) => {
              if (!state._dataSyncSubscriptions[id]) {
                state._dataSyncSubscriptions[id] = {}
              }
              state._dataSyncSubscriptions[id][sourceKey] = unsubscribe
            })
          } else {
            _map?.addSource(sourceKey, sourceSpec as SourceSpecification)
          }

          if ('popupOpts' in options.layerConf) {
            if (options.layerConf.popupOpts) {
              const popupOpts = options.layerConf.popupOpts

              if (sourceKey === popupOpts.source) {
                sourceOptions.popupOpts = popupOpts
              }
            }
          }

          layerGroup.sources[sourceKey] = sourceOptions

          if (sourceOptions.extendedOpts) {
            // for geojson sources, optionally fetch the data to ensure it is available locally
            // maplibre typically stores only the url string in the source spec
            // and fetches the data when needed, but that makes querying the data impossible
            let dataSearchOpts: DataSearchOpts | undefined

            if (
              'dataSearchOpts' in sourceOptions.extendedOpts &&
              sourceOptions.extendedOpts.dataSearchOpts
            ) {
              dataSearchOpts = sourceOptions.extendedOpts.dataSearchOpts
            }
            if (
              sourceOptions.type === 'geojson' &&
              (sourceOptions.extendedOpts.ensureLocalData || dataSearchOpts) &&
              typeof sourceOptions.url === 'string' // Data is a URL
            ) {
              data = await geoserverJsonQuery(
                sourceOptions.url,
                sourceOptions.extendedOpts.useAccessToken
              )
              if (data) {
                const source = _map?.getSource(sourceKey)
                ;(source as GeoJSONSource).setData(data)
              }
            }
            if (
              'dataSearchOpts' in sourceOptions.extendedOpts &&
              sourceOptions.extendedOpts?.dataSearchOpts
            ) {
              const dataSearchOpts = sourceOptions.extendedOpts.dataSearchOpts

              set((state) => {
                state.searchableDatas[id] = {
                  layerGroupId: id,
                  data: data as FeatureCollection, // if the source type is store or geojson, the data should be available
                  name: dataSearchOpts.name,
                  fields: dataSearchOpts.fields,
                  enabled: options.isHidden ? false : true,
                  ...(dataSearchOpts.appendDatasetName && {
                    appendDataSetName: dataSearchOpts.appendDatasetName,
                  }),
                  ...(dataSearchOpts.displayPattern && {
                    displayPattern: dataSearchOpts.displayPattern,
                  }),
                  ...(dataSearchOpts.getCoordinates && {
                    getCoordinates: dataSearchOpts.getCoordinates,
                  }),
                }
              })
            }
          }
        }

        for (const layer of style.layers) {
          let matchingSource = null

          if (layer.source) {
            matchingSource = layerGroup.sources[layer.source]
          }

          const layerOptions: LayerOptions = {
            id: layer.id,
            ...(layer.source && {
              source: layer.source,
            }),
            ...(layer['source-layer'] && {
              sourceLayer: layer['source-layer'],
            }),
            name: getLayerName(layer.id),
            layerType: layer.type,
            activeOn: layer.activeOn || 'always',
            selectable:
              layer.selectable ??
              (matchingSource && matchingSource.extendedOpts?.selectable) ??
              false,
            multiSelectable:
              (matchingSource &&
                matchingSource.extendedOpts?.multiSelectable) ??
              false,
            hoverPointer:
              layer.hoverPointer ??
              layer.selectable ??
              (matchingSource && matchingSource.extendedOpts?.selectable) ??
              false,
            popupOpts: null,
          }

          if (layerOptions.activeOn != 'always' && layer.type != 'background') {
            layer.filter = ['in', ['id'], '']
          }

          layerGroup.layers[layer.id] = layerOptions

          if (layer.source) {
            layerGroup.sources[layer.source].layerIds.push(layer.id)
          }

          if (
            'popupOpts' in options.layerConf &&
            options.layerConf.popupOpts &&
            layer.type != 'background'
          ) {
            if (layer.selectable || layer.multiSelectable) {
              const popupOpts = options.layerConf.popupOpts

              if (isMatchingSource(layer, popupOpts)) {
                layerOptions.popupOpts = popupOpts
              }
            }
          }

          if (layer.generatedFillPatternOptions) {
            applyCanvasFillPattern(
              _map,
              layer,
              layer.generatedFillPatternOptions
            )
          }

          set((state) => {
            // @ts-ignore
            state._layerInstances[layer.id] = layer
          })

          // if the layer is added before, add the first layer before the neighboring layer
          // The consecutive layers are added after the first layer
          // In MapLibre, the last layer is rendered on top.
          if (layerInsertId == null || _map?.getLayer(layerInsertId) == null) {
            let layerAdded = false

            if (options.layerOrderOptions) {
              if (options.layerOrderOptions.neighboringLayerGroupId) {
                const neighborLayerOrderLevel =
                  _layerGroups[
                    options.layerOrderOptions.neighboringLayerGroupId
                  ]?.orderLevel

                if (neighborLayerOrderLevel) {
                  let neighborLayerId: string | null
                  if (options.layerOrderOptions.isAddedUnder) {
                    neighborLayerId = findFirstMatchingLayer(
                      options.layerOrderOptions.neighboringLayerGroupId,
                      _map
                    )
                    if (neighborLayerId != null) {
                      _map?.addLayer(layer, neighborLayerId)

                      layerAdded = true
                    }
                  } else {
                    neighborLayerId = findLastMatchingLayer(
                      options.layerOrderOptions.neighboringLayerGroupId,
                      _map
                    )

                    if (neighborLayerId != null) {
                      addLayerAfter(layer, neighborLayerId, _map)

                      layerAdded = true
                    }
                  }

                  if (neighborLayerId == null) {
                    console.warn(
                      `No neighboring layer found for layer group ${id}. Adding layers based on order level.`
                    )
                  }
                }
              }
            }
            if (!layerAdded) {
              addLayerByOrderLevel({
                layer,
                orderLevel,
                map: _map,
                isAddedUnder: options.layerOrderOptions?.isAddedUnder,
              })
            }
          } else if (layerInsertId != null) {
            // if the layer is not first to be added in the group, simply add it after the last added layer
            addLayerAfter(layer, layerInsertId, _map)
          }

          layerInsertId = layer.id

          // if layerInsertId is null, this is the first layer to be added
          // if (layerInsertId == null) {
          //   if (
          //     options.layerOrderOptions &&
          //     'neighboringLayerGroupId' in options.layerOrderOptions &&
          //     options.layerOrderOptions.neighboringLayerGroupId
          //   ) {
          //     if (
          //       'neighboringLayerGroupId' in options.layerOrderOptions &&
          //       options.layerOrderOptions.neighboringLayerGroupId != null
          //     ) {
          //       const beforeLayer = findFirstMatchingLayer(
          //         options.layerOrderOptions.neighboringLayerGroupId,
          //         _map
          //       )
          //       _map?.addLayer(layer, beforeLayer || undefined)
          //     } else {
          //       const mapLayers = _map?.getStyle().layers
          //       if (mapLayers && mapLayers.length > 0) {
          //         // add layer before the first layer, if there is one
          //         _map?.addLayer(layer, mapLayers[0].id)
          //       } else {
          //         // or if not, just add it normally
          //         _map?.addLayer(layer)
          //       }
          //     }
          //   }
          //   // If the layer is added after (over), add the first layer after the neighboring layer
          //   else {
          //     if (
          //       options.layerOrderOptions &&
          //       'neighboringLayerGroupId' in options.layerOrderOptions &&
          //       options.layerOrderOptions.neighboringLayerGroupId != null
          //     ) {
          //       layerInsertId = findLastMatchingLayer(
          //         options.layerOrderOptions.neighboringLayerGroupId,
          //         _map
          //       )
          //     }

          //     if (layerInsertId != null) {
          //       addLayerAfter(layer, layerInsertId, _map)
          //     } else {
          //       // No neighboring layer found, so add the first layer to the map
          //       if (
          //         options.layerOrderOptions &&
          //         'isBackground' in options.layerOrderOptions &&
          //         options.layerOrderOptions.isBackground
          //       ) {
          //         // if the layer is a background layer, find the first
          //         // layer, if there are any. The background layer goes underneath it.
          //         const firstLayer = findFirstMatchingLayer('', _map)
          //         _map?.addLayer(layer, firstLayer ? firstLayer : undefined)
          //       } else {
          //         _map?.addLayer(layer)
          //       }
          //     }
          //     // }
          //   }
          // }
          // // the consecutive layers are added after the first layer
          // else {
          //   addLayerAfter(layer, layerInsertId, _map)
          //   layerInsertId = layer.id
          // }

          // layerInsertId = layer.id
          //   }

          // add the group to state after the first layer is added, in case other layers are dependant on the group configs
          set((state) => {
            state._layerGroups[id] = layerGroup
          })

          // create a deep copy of the object, preserving immutability. Zustand has frozen the previous object.
          layerGroup = cloneDeep(layerGroup)

          if (!options.isHidden) {
            _map?.setLayoutProperty(layer.id, 'visibility', 'visible')
          } else {
            _map?.setLayoutProperty(layer.id, 'visibility', 'none')
          }
        }

        if (options.layerConf.eventHandlers && _map) {
          for (const eventHandlerOptions of options.layerConf.eventHandlers) {
            const eventHandler = eventHandlerOptions.handlerCreator(_map)

            layerGroup.eventHandlers.push({
              layers: eventHandlerOptions.layers,
              eventType: eventHandlerOptions.eventType,
              handler: eventHandler,
            })
          }
        }

        layerGroup.isProcessing = false

        set((state) => {
          state._layerGroups[id] = layerGroup

          if (options.layerConf.joinedSelectionSources) {
            options.layerConf.joinedSelectionSources.forEach(
              (newJoinedArray: SelectionSource[]) => {
                const alreadyExists = state._joinedSelectionSourceMap.some(
                  (existingJoinedArray) =>
                    isEqual(existingJoinedArray, newJoinedArray)
                )
                if (!alreadyExists) {
                  state._joinedSelectionSourceMap.push(newJoinedArray)
                }
              }
            )
          }
        })

        const { layerGroupOpacities, setLayerGroupOpacity } = get()
        const storedOpacity = layerGroupOpacities[id]
        if (storedOpacity != null) {
          await setLayerGroupOpacity(id, storedOpacity, { skipQueue: true })
        }

        _enableLayerGroupEventHandlers(id)
        _updateSelectableHoverHandlers()
      } catch (e: any) {
        if (!e.message.includes('There is already a source')) {
          console.error('Error adding the layer group: ', id)
          console.error(e)
          if (dataHasBeenAdded && get()._layerGroups[id]) {
            console.log('Rolling back the layer group: ', id)
            get().removeLayerGroup(id)
          }
        } else {
          console.error(
            'Layer group already exists, or there is a conflicting source id. Aborting adding the layer group: ',
            id
          )
        }
      }
    },

    _runLayerGroupActivationActions: async (
      layerGroupIdString: string,
      opts?: LayerGroupAddOptions | SerializableLayerGroupAddOptions
    ) => {
      if (opts != null) {
        const { getAndFitBounds, _drawOptions, _removeDraw } = get()
        const _map = useMapInstanceStore.getState()._map

        if (opts?.zoomToExtent) {
          getAndFitBounds(layerGroupIdString, undefined, {
            skipQueue: true,
          })
        }

        if (
          opts?.drawOptions != null &&
          (opts.drawOptions.polygonEnabled || opts.drawOptions.editEnabled)
        ) {
          if (_drawOptions != null) {
            await _removeDraw({ skipQueue: true })
          }
          set((state) => {
            const prevDrawOptions = state._drawOptions
            const corridorHalfWidth =
              opts.drawOptions?.corridorHalfWidthMeters ??
              prevDrawOptions?.corridorHalfWidthMeters ??
              3
            const corridorEnabled =
              opts.drawOptions?.corridorEnabled ??
              prevDrawOptions?.corridorEnabled ??
              true

            state._drawOptions = {
              polygonEnabled: false,
              editEnabled: false,
              deleteOptions: {
                enabled: false,
                deleteOutsideDrawMode: false,
              },
              corridorEnabled,
              corridorHalfWidthMeters: corridorHalfWidth,
              ...opts.drawOptions,
              currentMode: null,
              layerGroupId: layerGroupIdString,
              isEnabled: true,
              drawGeneration: prevDrawOptions?.drawGeneration ?? 0,
            }
          })
        }

        if ('dataUpdateMutator' in opts) {
          let lastDataRef: FeatureCollection | null = null
          const handleDataUpdate = (e: any) => {
            // Early return if not the source we care about
            if (e.sourceId !== layerGroupIdString) return
            if (!e.isSourceLoaded) return
            if (e.sourceDataType && e.sourceDataType !== 'content') return

            if ('data' in e.source) {
              const data = e.source.data as FeatureCollection | undefined
              if (
                data?.type === 'FeatureCollection' &&
                Array.isArray((data as any).features)
              ) {
                // Skip if this data is the same as the last we processed
                if (
                  lastDataRef &&
                  (lastDataRef === data || isEqual(lastDataRef, data))
                ) {
                  return
                }
                lastDataRef = data
                opts.dataUpdateMutator?.(data) // Update Zustand store with new data
              }
            }
          }

          set((state) => {
            state._layerGroups[layerGroupIdString].handleDataUpdate =
              handleDataUpdate
          })
          // Use 'sourcedata' event instead of generic 'data' - more specific and efficient
          _map?.on('sourcedata', handleDataUpdate)
        }
      }
    },

    _enableLayerGroupEventHandlers: (layerGroupId: string) => {
      const { _layerGroups } = get()
      const _map = useMapInstanceStore.getState()._map

      for (const eventHandlerOptions of _layerGroups[layerGroupId]
        .eventHandlers) {
        if (
          eventHandlerOptions.layers == null ||
          eventHandlerOptions.layers.length === 0
        ) {
          _map?.on(eventHandlerOptions.eventType, eventHandlerOptions.handler)
        } else {
          _map?.on(
            eventHandlerOptions.eventType,
            eventHandlerOptions.layers,
            eventHandlerOptions.handler
          )
        }
      }
    },

    _disableLayerGroupEventHandlers: (layerGroupId: string) => {
      const { _layerGroups } = get()
      const _map = useMapInstanceStore.getState()._map

      for (const eventHandlerOptions of _layerGroups[layerGroupId]
        .eventHandlers) {
        _map?.off(
          eventHandlerOptions.eventType,
          eventHandlerOptions.layers,
          eventHandlerOptions.handler
        )
      }
    },

    _addPersistingLayerGroupAddOptions: (
      id: string,
      serializableLayerGroupAddOptions: SerializableLayerGroupAddOptions
    ) => {
      // TODO: Find a better fix for this, instead of casting to any
      // For some reason immer doesn't like the Mapbox Source object type
      set((state) => {
        state._persistingLayerGroupAddOptions[id] =
          serializableLayerGroupAddOptions as any
      })
    },

    _removePersistingLayerGroupAddOptions: (id: string) => {
      set((state) => {
        delete state._persistingLayerGroupAddOptions[id]
      })
    },
  }

  return { ...vars, ...actions }
}
