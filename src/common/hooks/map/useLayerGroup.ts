import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useMapStore } from '#/common/store/mapStore'
import { useDoesLayerGroupExist } from '#/common/hooks/map/useDoesLayerGroupExist'
import { useIsLayerGroupVisible } from '#/common/hooks/map/useIsLayerGroupVisible'
import { LayerConf } from '#/common/types/map'

export type LayerGroupStatus = 'visible' | 'processing' | 'hidden'

// Why all the complexity: The current implemetation allows for turning the layer group on and
// off, even while being preloaded.

export const useLayerGroup = (
  layerGroupId: string,
  layerConf: LayerConf | (() => Promise<LayerConf>),
  options: {
    preload?: boolean
    initActions?: () => Promise<void>
    // When this value changes, the layer group will be removed and recreated
    // and the cached layer configuration is invalidated.
    confVersion?: string | number
  } = {}
): [LayerGroupStatus, (shouldBeEnabled: boolean) => void] => {
  const { preload = false, initActions, confVersion } = options
  const addLayerGroup = useMapStore((state) => state.addLayerGroup)
  const enableLayerGroup = useMapStore((state) => state.enableLayerGroup)
  const disableLayerGroup = useMapStore((state) => state.disableLayerGroup)
  const removeLayerGroup = useMapStore((state) => state.removeLayerGroup)

  const doesLayerGroupExist = useDoesLayerGroupExist(layerGroupId)
  const isLayerGroupVisible = useIsLayerGroupVisible(layerGroupId)

  // Async initialization can finish after a route/gate has unmounted. Never
  // install a group (or start another read) for an obsolete hook lifetime.
  const lifetime = useRef({ active: true })

  const isUpdating = useRef(false)
  const initCompleted = useRef(false)
  const enableQueued = useRef(false)
  const layerConfRef = useRef<LayerConf | null>(null)
  const confVersionRef = useRef<string | number | undefined>(confVersion)

  useEffect(() => {
    const current = { active: true }
    lifetime.current = current
    isUpdating.current = false
    enableQueued.current = false
    return () => {
      current.active = false
    }
  }, [])

  const [uiQueued, setUiQueued] = useState(false)

  const resolveLayerConf = useCallback(async () => {
    const current = lifetime.current
    if (layerConfRef.current) {
      return layerConfRef.current
    }
    let conf: LayerConf

    if (typeof layerConf === 'function') {
      conf = await layerConf()
    } else {
      conf = layerConf
    }
    if (current.active) layerConfRef.current = conf
    return conf
  }, [layerConf])

  const runInitActions = useCallback(async () => {
    const current = lifetime.current
    if (initActions && !initCompleted.current) {
      await initActions()
      if (current.active) initCompleted.current = true
    }
  }, [initActions])

  const layerGroupStatus: LayerGroupStatus = useMemo(() => {
    if (isLayerGroupVisible) {
      return 'visible'
    }
    if (uiQueued) {
      return 'processing'
    }
    return 'hidden'
  }, [isLayerGroupVisible, uiQueued])

  const setEnabled = useCallback(
    async (shouldBeEnabled: boolean) => {
      const current = lifetime.current
      if (!current.active) return
      if (isUpdating.current) {
        enableQueued.current = shouldBeEnabled
        setUiQueued(shouldBeEnabled)
        return
      }
      isUpdating.current = true

      try {
        if (shouldBeEnabled) {
          await runInitActions()
          if (!current.active) return

          const group = useMapStore.getState()._layerGroups[layerGroupId]
          if (group) {
            if (group.isHidden) {
              await enableLayerGroup(layerGroupId, {})
            }
          } else {
            const conf = await resolveLayerConf()
            if (!current.active) return
            await addLayerGroup(layerGroupId, {
              layerConf: conf,
              isCurrent: () => current.active,
            })
          }
        } else {
          const group = useMapStore.getState()._layerGroups[layerGroupId]

          if (group && !group.isHidden) {
            await disableLayerGroup(layerGroupId)
          }
        }
      } catch (error) {
        if (!current.active) return
        console.error(
          `Failed to set enabled state for layer group ${layerGroupId}`,
          error
        )
      } finally {
        if (current.active) {
          isUpdating.current = false
          setUiQueued(false)
          enableQueued.current = false
        }
      }
    },
    [
      runInitActions,
      resolveLayerConf,
      addLayerGroup,
      enableLayerGroup,
      disableLayerGroup,
      layerGroupId,
    ]
  )

  // Invalidate and recreate the layer group when confVersion changes
  useEffect(() => {
    if (confVersionRef.current === confVersion) return
    // Update stored version
    confVersionRef.current = confVersion

    const recreate = async () => {
      const current = lifetime.current
      try {
        const group = useMapStore.getState()._layerGroups[layerGroupId]
        const wasVisible = !!group && !group.isHidden
        if (group) {
          await removeLayerGroup(layerGroupId)
        }
        if (!current.active) return
        // clear cached conf so the next add uses latest configuration
        layerConfRef.current = null
        // If the group was visible, re-enable to recreate immediately
        if (wasVisible) {
          await setEnabled(true)
        }
      } catch (err) {
        console.error(`Failed to recreate layer group ${layerGroupId}`, err)
      }
    }

    recreate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confVersion, layerGroupId, removeLayerGroup])

  useEffect(() => {
    if (!preload || doesLayerGroupExist) {
      return
    }

    const preloadLayer = async () => {
      const current = lifetime.current
      if (!current.active) return
      if (isUpdating.current) return
      isUpdating.current = true

      try {
        await runInitActions()
        if (!current.active) return
        const conf = await resolveLayerConf()
        if (!current.active) return

        // Check again inside async function in case initActions added the layer
        if (!useMapStore.getState()._layerGroups[layerGroupId]) {
          await addLayerGroup(layerGroupId, {
            layerConf: conf,
            isHidden: true,
            isCurrent: () => current.active,
          })
        }
      } catch (error) {
        if (!current.active) return
        console.error(`Failed to preload layer group ${layerGroupId}`, error)
      } finally {
        if (current.active) {
          isUpdating.current = false
          if (enableQueued.current) {
            enableQueued.current = false
            setEnabled(true)
          }
        }
      }
    }

    preloadLayer()
  }, [
    preload,
    doesLayerGroupExist,
    runInitActions,
    resolveLayerConf,
    addLayerGroup,
    layerGroupId,
    setEnabled,
  ])

  return [layerGroupStatus, setEnabled]
}
