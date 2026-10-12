import type {
  Map as MapLibreMap,
  LayerSpecification,
  SourceSpecification,
} from 'maplibre-gl'
export const mockAreaMap = () => {
  let zoom = 6
  const sources = new Map<string, SourceSpecification>()
  const layers = new Map<string, LayerSpecification>()
  const listeners = new Map<string, Set<(event: never) => void>>()
  const featureState = new Map<string, object>()
  const map = {
    getZoom: () => zoom,
    getMinZoom: () => 0,
    getMaxZoom: () => 24,
    jumpTo: ({ zoom: next }: { zoom: number }) => {
      zoom = next
      ;[...(listeners.get('zoom') ?? [])].forEach((fn) => fn({} as never))
    },
    getStyle: () => ({
      version: 8,
      sources: Object.fromEntries(sources),
      layers: [...layers.values()],
    }),
    isStyleLoaded: () => true,
    getSource: (id: string) => sources.get(id),
    addSource: jest.fn((id: string, source: SourceSpecification) => {
      sources.set(id, JSON.parse(JSON.stringify(source)))
    }),
    removeSource: (id: string) => {
      sources.delete(id)
    },
    getLayer: (id: string) => layers.get(id),
    addLayer: (layer: LayerSpecification) => {
      layers.set(layer.id, JSON.parse(JSON.stringify(layer)))
    },
    removeLayer: (id: string) => {
      layers.delete(id)
    },
    setLayerZoomRange: (id: string, minzoom: number, maxzoom: number) =>
      Object.assign(layers.get(id)!, { minzoom, maxzoom }),
    getLayoutProperty: (id: string, name: string) =>
      (layers.get(id)?.layout as Record<string, unknown>)?.[name],
    setLayoutProperty: (id: string, name: string, value: unknown) => {
      const layer = layers.get(id)!
      layer.layout = { ...layer.layout, [name]: value } as never
    },
    setPaintProperty: (id: string, name: string, value: unknown) => {
      const layer = layers.get(id)!
      layer.paint = { ...layer.paint, [name]: value } as never
    },
    setFeatureState: (target: object, value: object) => {
      featureState.set(JSON.stringify(target), value)
    },
    removeFeatureState: (target: object) => {
      for (const key of featureState.keys()) {
        const ref = JSON.parse(key)
        if (
          Object.entries(target).every(
            ([name, value]) => value === undefined || ref[name] === value
          )
        )
          featureState.delete(key)
      }
    },
    refreshTiles: jest.fn(),
    on: (name: string, ...args: unknown[]) => {
      const listener = args.at(-1) as (event: never) => void
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name)!.add(listener)
    },
    off: (name: string, ...args: unknown[]) => {
      listeners.get(name)?.delete(args.at(-1) as never)
    },
    once: () => {},
    getCanvas: () => ({ style: {} }),
  }
  return {
    map: map as unknown as MapLibreMap,
    sources,
    layers,
    listeners,
    featureState,
    zoom: (value: number) => {
      zoom = value
      ;[...(listeners.get('zoom') ?? [])].forEach((fn) => fn({} as never))
    },
    fire: (name: string, event = {}) =>
      [...(listeners.get(name) ?? [])].forEach((fn) => fn(event as never)),
  }
}
