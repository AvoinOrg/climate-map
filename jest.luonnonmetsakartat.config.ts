import type { Config } from 'jest'
import baseConfig from './jest.config'

// Applet suites are automatic; shared contracts are deliberately allowlisted.
// See agents/luonnonmetsakartat-mock-browser.md before extending this boundary.
const config: Config = {
  ...baseConfig,
  testMatch: [
    '<rootDir>/src/applets/luonnonmetsakartat/**/*.{test,spec}.{js,jsx,ts,tsx}',
    ...[
      'src/common/config/publicGeoServer.test.ts',
      'src/common/server/apiProxy.test.ts',
      'src/components/Map/mapAuthTransformRequest.test.ts',
      'src/common/auth/client.test.tsx',
      'src/common/auth/normalize.test.ts',
      'src/common/auth/mock.test.ts',
      'src/common/utils/auth.test.ts',
      'src/common/utils/authPopup.test.ts',
      'src/runtime/auth/request.test.ts',
      'src/runtime/auth/session.test.ts',
      'src/runtime/api/userinfo.test.ts',
      'src/common/routing/publicRoutes.test.ts',
      'src/common/routing/requestRouting.test.ts',
      'src/common/routing/appletSelectionContract.test.ts',
      'src/common/routing/routeMetadata.test.ts',
      'src/common/navigation/appRouteLinks.test.tsx',
      'utils/scripts/appletBuildConfig.test.js',
      'utils/scripts/prebuildFolderPrune.test.js',
      'utils/scripts/writeNetlifyRedirects.test.js',
      'src/common/component-fixtures/registry.test.ts',
      'src/routes/$locale/dev/component-fixtures/-guards.test.ts',
      '__tests__/visual/scenarios.test.js',
      '__tests__/visual/impactMap.test.js',
      'utils/scripts/visual/luonnonmetsakartat-mock-smoke.test.js',
    ].map((path) => `<rootDir>/${path}`),
  ],
}

export default config
