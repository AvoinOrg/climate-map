import { createTheme } from '@mui/material/styles'
import { TypographyOptions } from '@mui/material/styles/createTypography'
import { Roboto } from '@next/font/google'

export const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: [
    'BlinkMacSystemFont',
    'Segoe UI',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
  ],
})

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

const fonts = {
  0: roboto.style.fontFamily,
  // 1: 'raleway',
}

const typography: TypographyOptions = {
  h1: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fonts[0],
    lineHeight: '1.35417em',
    fontSize: '1.5rem',
    fontWeight: 400,
  },
  button: {
    textTransform: 'none',
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fonts[0],
    fontSize: '1rem',
    fontWeight: 500,
  },
  caption: {
    color: 'rgba(0, 0, 0, 0.54)',
    fontFamily: fonts[0],
    lineHeight: '1.375em',
    fontSize: '0.75rem',
    fontWeight: 400,
  },
  h2: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fonts[0],
    lineHeight: '1.16667em',
    fontSize: '1.3125rem',
    fontWeight: 500,
  },
  h3: {
    color: 'rgba(0, 0, 0, 0.87)',
    fontFamily: fonts[0],
    lineHeight: '1.5em',
    fontSize: '1rem',
    fontWeight: 400,
  },
  fontFamily: fonts[0],
}

export default createTheme({ palette, typography, zIndex })
