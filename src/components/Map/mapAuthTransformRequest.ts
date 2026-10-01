import { transformRegisteredMapTileRequest } from '#/common/utils/mapTileRequestTransforms'
import type { RequestTransformFunction } from 'maplibre-gl'

import {
  isPublicGeoServerRequest,
  resolvePublicGeoServerBase,
} from '#/common/config/publicGeoServer'
import { EMBEDDED_PARAMS_URL_PREFIX } from '#/common/types/map'
import { decodeUrlAndParams } from '#/common/utils/map'

type CreateMapTransformRequestOptions = {
  accessToken?: string
  addStaleSourceId?: (sourceId: string) => void
}

export const createMapTransformRequest = ({
  accessToken,
  addStaleSourceId,
}: CreateMapTransformRequestOptions): RequestTransformFunction => {
  const publicGeoServerBaseUrl = resolvePublicGeoServerBase()

  const transformAuthRequest: RequestTransformFunction = (url) => {
    if (url.startsWith(EMBEDDED_PARAMS_URL_PREFIX)) {
      const decoded = decodeUrlAndParams(url)
      if (decoded == null) {
        console.error('Maplibre: Could not decode URL and parameters from', url)
        return { url }
      }

      const { url: originalUrl, params } = decoded

      if (params.useAccessToken) {
        if (!accessToken) {
          console.error(
            'Maplibre: No access token provided for the request.',
            originalUrl
          )

          addStaleSourceId?.(
            typeof params.sourceId === 'string' ? params.sourceId : originalUrl
          )

          return { url: originalUrl }
        }

        return {
          url: originalUrl,
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      }

      return { url: originalUrl }
    }

    if (
      url.includes('requireToken=true') &&
      publicGeoServerBaseUrl != null &&
      isPublicGeoServerRequest({ url, baseUrl: publicGeoServerBaseUrl })
    ) {
      if (!accessToken) {
        console.error('Maplibre: No access token provided for the request.', url)
        return { url }
      }

      return {
        url,
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    }
  }
  return (url, resourceType) => {
    const authenticated = transformAuthRequest(url, resourceType)
    return resourceType === 'Tile'
      ? transformRegisteredMapTileRequest(authenticated ?? { url }) ?? authenticated
      : authenticated
  }
}
