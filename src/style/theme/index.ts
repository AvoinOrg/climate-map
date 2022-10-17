import { createTheme } from '@mui/material/styles'

import { StyleRules } from '@mui/styles'

const palette = {
  primary: { main: '#0B2027' },
  secondary: { main: '#126A42' },
  info: { main: '##fbfbfb' },
}

const zIndex = {
  modal: 1200,
  snackbar: 1400,
  drawer: 1100,
  appBar: 1300,
  mobileStepper: 1000,
  tooltip: 1500,
}

const fontFamily = {
  0: 'raleway',
  1: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
}

const typography: StyleRules = {
  headline: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fontFamily[0],
    lineHeight: '1.35417em',
    fontSize: '1.5rem',
    fontWeight: 400,
  },
  display2: {
    marginLeft: '-.02em',
    color: 'rgba(0, 0, 0, 0.54)',
    fontFamily: fontFamily[0],
    lineHeight: '1.13333em',
    fontSize: '2.8125rem',
    fontWeight: 400,
  },
  display3: {
    marginLeft: '-.02em',
    color: 'rgba(0, 0, 0, 0.54)',
    fontFamily: fontFamily[0],
    letterSpacing: '-.02em',
    lineHeight: '1.30357em',
    fontSize: '3.5rem',
    fontWeight: 400,
  },
  display4: {
    marginLeft: '-.04em',
    color: 'rgba(0, 0, 0, 0.54)',
    fontFamily: fontFamily[0],
    letterSpacing: '-.04em',
    lineHeight: '1.14286em',
    fontSize: '7rem',
    fontWeight: 300,
  },
  display1: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontFamily: fontFamily[0],
    lineHeight: '1.20588em',
    fontSize: '2.125rem',
    fontWeight: 400,
  },
  button: {
    textTransform: 'none',
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fontFamily[0],
    fontSize: '1rem',
    fontWeight: 500,
  },
  caption: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontFamily: fontFamily[0],
    lineHeight: '1.375em',
    fontSize: '0.75rem',
    fontWeight: 400,
  },
  title: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fontFamily[0],
    lineHeight: '1.16667em',
    fontSize: '1.3125rem',
    fontWeight: 500,
  },
  subheading: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fontFamily[0],
    lineHeight: '1.5em',
    fontSize: '1rem',
    fontWeight: 400,
  },
  light: {
    fontWeight: 300,
  },
  regular: {
    fontWeight: 400,
  },
  medium: {
    fontWeight: 500,
  },
  fontFamily,
}

export default createTheme({ palette, typography, zIndex })
