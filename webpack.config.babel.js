import 'dotenv/config'
import path from 'path'
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin'
import webpack from 'webpack'

import HtmlWebpackPlugin from 'html-webpack-plugin'
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'
import { GitRevisionPlugin } from 'git-revision-webpack-plugin'
import { CleanWebpackPlugin } from 'clean-webpack-plugin'
import ESLintPlugin from 'eslint-webpack-plugin'
import Dotenv from 'dotenv-webpack'
import { PartyModeSharp } from '@material-ui/icons'

const buildReport = process.env.BUILD_REPORT === 'true'

const config = {
  mode: process.env.NODE_ENV || 'development',
  path: path.resolve(__dirname, 'build'),
}
const isDevelopment = process.env.NODE_ENV !== 'production'

const gitRevisionPlugin = config.mode === 'production' ? null : new GitRevisionPlugin()

const fontCssFileName = 'woff2.css'

const port = process.env.DEV_PORT ? process.env.DEV_PORT : 3000

const plugins = [
  ...(gitRevisionPlugin ? [gitRevisionPlugin] : []),
  // TODO: check how to get rid of this
  new MiniCssExtractPlugin({ filename: 'style/styles-[fullhash].css' }),
  new HtmlWebpackPlugin({ template: './public/index.html' }),
  new webpack.DefinePlugin({
    __APPLICATION_VERSION__: gitRevisionPlugin
      ? JSON.stringify(gitRevisionPlugin.version())
      : JSON.stringify(process.env.APP_VERSION),
  }),
  new CleanWebpackPlugin(),
  new Dotenv(),
  new ESLintPlugin(),
]

if (isDevelopment) {
  plugins.push(new webpack.HotModuleReplacementPlugin())
  plugins.push(new ReactRefreshWebpackPlugin())
}

if (buildReport) {
  plugins.push(new BundleAnalyzerPlugin())
}

console.log(path.resolve(__dirname, 'src/components/'))

const appConfig = {
  mode: config.mode,
  devtool: 'source-map',
  entry: ['./src/Entry.tsx'],
  resolve: {
    extensions: ['.webpack-loader.js', '.web-loader.js', '.loader.js', '.js', '.jsx', '.ts', '.tsx'],
    modules: ['node_modules', path.resolve(__dirname, 'src')],
    alias: {
      Components: path.resolve(__dirname, 'src/components/'),
      Utils: path.resolve(__dirname, 'src/utils/'),
      State: path.resolve(__dirname, 'src/state/'),
      Types: path.resolve(__dirname, 'src/types/'),
      Assets: path.resolve(__dirname, 'src/assets/'),
      Style: path.resolve(__dirname, 'src/style/'),
    },
  },
  // baseUrl: './src',
  // paths: {
  //   'Components/*': ['components/*'],
  //   'Utils/*': ['utils/*'],
  //   'State/*': ['state/*'],
  //   'Types/*': ['types/*'],
  //   'Assets/*': ['assets/*'],
  // },
  output: {
    filename: 'js/bundle-[fullhash].js',
    path: config.path,
  },
  devServer: {
    hot: true,
    // disableHostCheck: true,
    proxy: [
      {
        context: ['/api', '/data'],
        target: process.env.API_URL,
      },
    ],
    compress: false,
    port,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        loader: 'babel-loader',
      },
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              plugins: isDevelopment ? [require.resolve('react-refresh/babel')] : [],
            },
          },
        ],
      },
      {
        test: /\.(less|css)$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
          },
          {
            loader: 'css-loader',
            options: {
              url: false,
              import: {
                filter: (url) => {
                  // Don't handle font css file import
                  if (url.includes(fontCssFileName)) {
                    return false
                  }

                  return true
                },
              },
            },
          },
          'less-loader',
        ],
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              url: false,
            },
          },
          {
            loader: 'sass-loader',
            options: {
              implementation: require.resolve('sass'),
              sassOptions: {
                outputStyle: 'compressed',
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|gif)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.svg/,
        type: 'asset/inline',
      },
    ],
  },
  plugins,
  stats: { children: false },
  optimization: {
    minimize: !isDevelopment,
    minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
  },
}

export default appConfig
