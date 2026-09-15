import type { ReactNode } from 'react'

jest.mock('maplibre-gl', () => {
  class MapLibreMapMock {}

  class LngLatBoundsMock {
    extend = () => this
  }

  return {
    __esModule: true,
    default: {
      Map: MapLibreMapMock,
      LngLatBounds: LngLatBoundsMock,
    },
    Map: MapLibreMapMock,
    LngLatBounds: LngLatBoundsMock,
  }
})

jest.mock('#/components/common/LayerToggleRow', () => ({
  LayerToggleRow: () => null,
  LayerToggleRowAccordion: ({ children }: { children: ReactNode }) => children,
}))

jest.mock('#/components/common/NumberInputField', () => ({
  NumberInputField: () => null,
}))

jest.mock('#/components/Sidebar/BreadcrumbNav', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('yet-another-react-lightbox', () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock('react-photo-album', () => ({
  __esModule: true,
  MasonryPhotoAlbum: () => null,
}))

jest.mock(
  'applets/carbon/components/CarbonLineChart/CarbonLineChart',
  () => ({
    __esModule: true,
    default: () => null,
  })
)

jest.mock(
  'applets/carbon/components/CarbonLineChart/CarbonLineChartInner',
  () => ({
    __esModule: true,
    default: () => null,
  })
)

jest.mock('#/common/hooks/ui/useIsMobile', () => ({
  useIsMobile: () => false,
}))

jest.mock('#/common/hooks/map/useVisibleLayerGroupIds', () => ({
  useVisibleLayerGroupIds: () => [],
}))

jest.mock('#/common/hooks/map/useLayerGroupOpacity', () => ({
  useLayerGroupOpacity: () => undefined,
}))

jest.mock('#/common/hooks/map/useDrawMode', () => ({
  useDrawMode: () => null,
}))

jest.mock('#/common/hooks/map/useIsDrawEnabled', () => ({
  useIsDrawEnabled: () => false,
}))

jest.mock('#/common/hooks/map/useAllowedDrawModes', () => ({
  useAllowedDrawModes: () => [],
}))

jest.mock('#/common/hooks/map/useSelectedDrawFeature', () => ({
  useSelectedDrawFeatures: () => [],
}))

jest.mock('#/common/hooks/map/useIsDrawDeleteAllowed', () => ({
  useIsDrawDeleteAllowed: () => false,
}))

jest.mock('#/common/utils/map', () => ({
  clampOpacity: (opacity: number) => opacity,
}))

jest.mock('#/common/navigation/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}))

jest.mock('#/common/store', () => ({
  useMapStore: Object.assign(jest.fn(), {
    setState: jest.fn(),
  }),
  useUIStore: Object.assign(jest.fn(), {
    setState: jest.fn(),
  }),
}))

jest.mock('#/common/store/userStore', () => ({
  useUserStore: Object.assign(jest.fn(), {
    setState: jest.fn(),
  }),
}))

import { componentFixtureMetadata } from './metadata'
import { getComponentFixtures } from './registry'

describe('component fixture registry', () => {
  test('matches the visual manifest metadata', () => {
    const registeredMetadata = getComponentFixtures().map((fixture) => ({
      id: fixture.id,
      label: fixture.label,
      ...(fixture.locale ? { locale: fixture.locale } : {}),
      description: fixture.description,
      sourceGlobs: fixture.sourceGlobs,
      states: fixture.states.map((state) => ({
        id: state.id,
        ...(state.locale ? { locale: state.locale } : {}),
        ...(state.waitFor ? { waitFor: state.waitFor } : {}),
        ...(state.maskSelectors ? { maskSelectors: state.maskSelectors } : {}),
      })),
    }))

    const manifestMetadata = componentFixtureMetadata.map((fixture) => ({
      id: fixture.id,
      label: fixture.label,
      ...(fixture.locale ? { locale: fixture.locale } : {}),
      description: fixture.description,
      sourceGlobs: fixture.sourceGlobs,
      states: fixture.states.map((state) => ({
        id: state.id,
        ...(state.locale ? { locale: state.locale } : {}),
        ...(state.waitFor ? { waitFor: state.waitFor } : {}),
        ...(state.maskSelectors ? { maskSelectors: state.maskSelectors } : {}),
      })),
    }))

    expect(registeredMetadata).toEqual(manifestMetadata)
  })
})
