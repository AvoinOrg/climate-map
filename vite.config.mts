import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv, transformWithEsbuild } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import type { Plugin, ResolvedConfig } from 'vite'
import {
  getStartPublicEnvDefines,
  getStartPublicEnvModuleDefines,
  isStartDebugClientBuild,
  reportStartPublicEnvDiagnostics,
  type StartLoadedEnv,
} from './utils/config/startPublicEnv'

const startMapLibreShim = fileURLToPath(
  new URL('./src/runtime/maplibre-gl.ts', import.meta.url)
)
const maplibreSymbolUtilsEsm = fileURLToPath(
  new URL('./node_modules/maplibre_symbol_utils/dist/index.js', import.meta.url)
)

const getStartLoadedEnv = (mode: string): StartLoadedEnv => ({
  ...loadEnv(mode, process.cwd(), ''),
  ...process.env,
})

const getStartTarget = (env: StartLoadedEnv) => {
  const target = env.START_TARGET?.trim()
  return target === '' ? undefined : target
}

const getStartBuildConfig = (debugClientErrors: boolean) => ({
  sourcemap: debugClientErrors,
  ...(debugClientErrors
    ? {
        minify: false,
        cssMinify: false,
      }
    : {}),
})

const startServerOnlyOptimizeDeps = new Set(['better-auth'])

const filterStartServerOnlyOptimizeDeps = (deps: string[] | undefined) =>
  deps?.filter((dep) => !startServerOnlyOptimizeDeps.has(dep))

const filterResolvedOptimizeDeps = (config: ResolvedConfig) => {
  config.optimizeDeps.include = filterStartServerOnlyOptimizeDeps(
    config.optimizeDeps.include
  )

  config.environments.client.optimizeDeps.include =
    filterStartServerOnlyOptimizeDeps(
      config.environments.client.optimizeDeps.include
    )
}

const startServerOnlyDependencyOptimizerPlugin = (): Plugin => ({
  name: 'avoin-start-server-only-dependency-optimizer',
  enforce: 'post',
  configResolved: filterResolvedOptimizeDeps,
})

export default defineConfig(({ mode }) => {
  const env = getStartLoadedEnv(mode)
  reportStartPublicEnvDiagnostics(env)
  const debugClientErrors = isStartDebugClientBuild(env)
  const startTarget = getStartTarget(env)

  return {
    define: getStartPublicEnvDefines(env),
    build: getStartBuildConfig(debugClientErrors),
    server: {
      host: '0.0.0.0',
      port: 6900,
      strictPort: true,
    },
    preview: {
      port: 3002,
      strictPort: true,
    },
    ssr: {
      // Nitro 2.12 can emit an unusable multi-version package symlink for this
      // direct server import when it is left external.
      noExternal: ['@visx/shape'],
    },
    resolve: {
      alias: [
        {
          find: /^maplibre-gl$/,
          replacement: startMapLibreShim,
        },
        {
          find: 'maplibre_symbol_utils',
          replacement: maplibreSymbolUtilsEsm,
        },
      ],
    },
    plugins: [
      {
        name: 'avoin-start-public-env-dev',
        apply: 'serve',
        enforce: 'post',
        async transform(code, id) {
          if (
            this.environment.config.consumer !== 'client' ||
            !/\.[cm]?[jt]sx?(?:\?|$)/.test(id) ||
            !code.includes('process.env.PUBLIC_')
          )
            return
          return transformWithEsbuild(code, id, {
            define: getStartPublicEnvModuleDefines({ code, env }),
            loader: 'js',
          })
        },
      },
      tsconfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tanstackStart({
        ...(startTarget ? { target: startTarget } : {}),
        customViteReactPlugin: true,
        tsr: {
          srcDirectory: 'src',
          routesDirectory: 'src/routes',
          generatedRouteTree: 'src/routeTree.gen.ts',
          routeFileIgnorePrefix: '-',
        },
      }),
      startServerOnlyDependencyOptimizerPlugin(),
      viteReact(),
    ],
  }
})
