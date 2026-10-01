import maplibregl from 'maplibre-gl'
import { registerMapTileRequestTransform } from '#/common/utils/mapTileRequestTransforms'
import type { AreaSourceDescriptor } from 'applets/energy/layers/areaSource'

let transportId = 0
const templatePattern = (template: string) =>
  new RegExp(
    `^${template
      .split(/(\{[zxy]\})/)
      .map((part) =>
        /^\{[zxy]\}$/.test(part)
          ? '\\d+'
          : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      )
      .join('')}$`
  )
// Preserve advertised source URLs/scheme/coordinates. Only the internal request
// transport uses a protocol; fetch receives the exact advertised HTTP(S) URL.
export const registerAreaTileTransport = ({
  descriptors,
  isCurrent,
}: {
  descriptors: readonly AreaSourceDescriptor[]
  isCurrent: () => boolean
}) => {
  const protocol = `energy-area-${++transportId}`
  const patterns = descriptors
    .flatMap((descriptor) => descriptor.source.tiles ?? [])
    .map(templatePattern)
  maplibregl.addProtocol(protocol, async (request, abortController) => {
    const url = decodeURIComponent(request.url.slice(protocol.length + 3))
    const response = await fetch(url, {
      signal: abortController.signal,
      headers: request.headers,
      credentials: request.credentials,
    })
    // Native VectorTileSource swallows status=404 as an empty tile. A transport
    // failure must reach its error event; a successful empty MVT stays valid.
    if (!response.ok) throw new Error('Area tile transport failed')
    const data = await response.arrayBuffer()
    abortController.signal.throwIfAborted()
    return {
      data,
      cacheControl: response.headers.get('Cache-Control') ?? undefined,
      expires: response.headers.get('Expires') ?? undefined,
    }
  })
  const unregister = registerMapTileRequestTransform((request) => {
    if (!isCurrent() || !patterns.some((pattern) => pattern.test(request.url)))
      return
    return {
      ...request,
      url: `${protocol}://${encodeURIComponent(request.url)}`,
    }
  })
  return () => {
    unregister()
    maplibregl.removeProtocol(protocol)
  }
}
