import type { Config } from 'jest'

const config: Config = {
  clearMocks: true,
  coverageProvider: 'v8',
  moduleNameMapper: {
    '^better-auth/react$': '<rootDir>/utils/test/jest/betterAuthReactMock.js',
    '^better-auth/client/plugins$':
      '<rootDir>/utils/test/jest/betterAuthClientPluginsMock.js',
    '^applets/(.*)$': '<rootDir>/src/applets/$1',
    '^map/(.*)$': '<rootDir>/src/app/[locale]/(map)/$1',
    '^#/(.*)$': '<rootDir>/src/$1',
    '^@i18n/(.*)$': '<rootDir>/i18n/$1',
    '\\.(css|less|sass|scss)$': '<rootDir>/utils/test/jest/styleMock.js',
    '\\.(png|jpg|jpeg|gif|webp|avif|ico|bmp|svg)$':
      '<rootDir>/utils/test/jest/fileMock.js',
  },
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/.codex/',
    '<rootDir>/.codex-orch/',
    '<rootDir>/.tmp/',
    '<rootDir>/agents/',
    '<rootDir>/legacy/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.codex-orch/'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx|mjs)$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: '<rootDir>/tsconfig.jest.json',
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/(?!lodash-es|better-auth/|react-photo-album/|yet-another-react-lightbox/)'],
}

export default config
