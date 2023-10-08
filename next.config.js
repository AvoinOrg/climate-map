const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // If set to true (default) openlayers will render blank.
  // Will probably be fixed later, either by swcMinify or Openlayers
  swcMinify: false,
  // emotion: true,
  experimental: {
    appDir: true,
  },
  compiler: {
    styledComponents: true,
  },
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    ol: {
      transform: 'ol/{{member}}',
    },
    '@mui/icons-material/?(((\\w*)?/?)*)': {
      transform: '@mui/icons-material/{{ matches.[1] }}/{{member}}',
    },
  },
  transpilePackages: ['lodash-es'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    // !! WARN !!
    // Dangerously allow production builds to successfully complete even if
    // your project has type errors.
    // !! WARN !!
    ignoreBuildErrors: true,
  },
  // i18n: {
  //   locales: ['en', 'fi'],
  //   localeDetection: true,
  //   defaultLocale: 'en',
  // },
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack }
  ) => {
    // Important: return the modified config

    config.plugins = config.plugins.concat([
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new CopyPlugin({
        patterns: [
          {
            // copy main public folder to the root public folder
            from: path.join(__dirname, '/src/public/**/*'),
            context: path.resolve(__dirname, 'src'),
            // removes the relative path from the public folder
            to: ({ context, absoluteFilename }) => {
              let relativePath = path.relative(context, absoluteFilename)
              let publicIndex = relativePath.indexOf('public') + 6 // To exclude 'public' from path
              return path.join(
                __dirname,
                '/public',
                relativePath.slice(publicIndex)
              )
            },
          },
          {
            // copy any app public folder to the root public folder
            from: path.join(__dirname, '/src/app/**/public/**/*'),
            context: path.resolve(__dirname, 'src/app'),
            to: ({ context, absoluteFilename }) => {
              let relativePath = path.relative(context, absoluteFilename)
              let publicIndex = relativePath.indexOf('public') + 6 // To exclude 'public' from path
              let newRelativePath = relativePath.slice(publicIndex)
              let parentDirectory = path.basename(
                path.dirname(relativePath.slice(0, publicIndex))
              )
              return path.join(
                __dirname,
                '/public',
                parentDirectory,
                newRelativePath
              )
            },
          },
            },
          },
          {
            // copy sql-wasm for the GPKG library used in carbon app
            from: path.join(__dirname, 'node_modules/rtree-sql.js/dist/sql-wasm.wasm'),
            to: path.join(__dirname, '/public/dyn/'),
          },
        ],
      }),
    ])

    config.resolve.mainFields.push(['browser', 'main'])

    config.resolve.fallback = { ...(config.resolve.fallback ? config.resolve.fallback : {}), ...{ fs: false } }

    return config
  },
}

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer(nextConfig)
