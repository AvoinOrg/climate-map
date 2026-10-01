import type { RequestParameters } from 'maplibre-gl'

type TileTransform = (
  request: RequestParameters
) => RequestParameters | undefined
const transforms = new Set<TileTransform>()
// MapLibre protocols provide observable tile transport, including statuses its
// native vector source suppresses. Registration belongs to the applet lifetime.
export const registerMapTileRequestTransform = (transform: TileTransform) => {
  transforms.add(transform)
  return () => {
    transforms.delete(transform)
  }
}
export const transformRegisteredMapTileRequest = (
  request: RequestParameters
) => {
  for (const transform of transforms) {
    const transformed = transform(request)
    if (transformed) return transformed
  }
}
