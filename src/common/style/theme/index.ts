import { createTheme, PaletteColor, PaletteColorOptions } from '@mui/material/styles'
import { TypographyOptions } from '@mui/material/styles/createTypography'
import { Arimo, Raleway } from '@next/font/google'
import '@mui/material/styles/createPalette'

//extending palette to add background color

declare module '@mui/material/styles/createPalette' {
  interface PaletteColor {
    lighter?: string
    darker?: string
  }

  interface SimplePaletteColorOptions {
    lighter?: string
    darker?: string
  }

  interface Palette {
    neutral: PaletteColor
  }
  interface PaletteOptions {
    neutral: PaletteColorOptions
  }
}

declare module '@mui/material/styles' {
  interface TypographyVariants {
    buttonSmall: React.CSSProperties
  }

  // allow configuration using `createTheme`
  interface TypographyVariantsOptions {
    buttonSmall?: React.CSSProperties
  }

  interface ZIndex {
    popup: number
  }

  interface ThemeOptions {
    zIndex?: Partial<ZIndex> | undefined
  }
}

declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    buttonSmall: true
  }
}

declare module '@mui/material/styles/createTypography' {
  interface TypographyOptions {
    h7?: React.CSSProperties
    body7?: React.CSSProperties
  }
}

export const arimo = Arimo({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: [
    'Arial',
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
  primary: { main: '#C7C9B8', dark: '#AFB29A', light: '#D7D9CC', lighter: '#EBECE6' },
  secondary: { dark: '#274AFF', main: '#5d77ff', light: '#b3bfff' },
  neutral: {
    main: '#D9D9D9',
    light: '#F6F4F4',
    dark: '#A0A0A0',
    darker: '#000000',
    lighter: '#FFFFFF',
  },
  info: { dark: '#EA7101', main: '#F09C4D' },
  warning: { main: '#EA7101' },
}

const shape = {
  borderRadius: 0,
}

const zIndex = {
  modal: 1200,
  snackbar: 1400,
  drawer: 1100,
  appBar: 1300,
  mobileStepper: 1000,
  popup: 1350,
  tooltip: 1500,
}

const fonts = {
  primary: arimo.style.fontFamily,
}

const typography: TypographyOptions = {
  fontFamily: fonts.primary,
  body1: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: 'normal',
    letterSpacing: '0.0875rem',
  },
  body2: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 'normal',
    letterSpacing: '0.0875rem',
  },
  body7: {
    fontFamily: fonts.primary,
    fontSize: '0.75rem',
    fontWeight: 400,
    lineHeight: 'normal',
    letterSpacing: '0.075rem',
  },
  h1: {
    fontFamily: fonts.primary,
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 'normal',
    letterSpacing: '0.15rem',
  },
  h2: {
    fontFamily: fonts.primary,
    fontSize: '1.125rem',
    fontWeight: 700,
    lineHeight: 'normal',
    letterSpacing: '0.1125rem',
  },
  h3: {
    fontFamily: fonts.primary,
    fontSize: '1rem',
    fontWeight: 700,
    lineHeight: '1.625rem',
    letterSpacing: '0.1rem',
  },
  h4: {
    fontFamily: fonts.primary,
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: '1.625rem',
    letterSpacing: '0.1rem',
  },
  h5: {
    fontFamily: fonts.primary,
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 'normal',
    letterSpacing: '0.1rem',
    textDecoration: 'underline',
  },
  h6: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 'normal',
    letterSpacing: '0.0875rem',
    textDecoration: 'underline',
  },
  // Adding additional typography options for h8 and body7
  h7: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: 'normal',
    letterSpacing: '0.0875rem',
  },
}

const components = {
  MuiTableRow: {
    styleOverrides: {
      root: {
        '&:last-child td': {
          borderBottom: 0,
        },
      },
    },
  },
  MuiCssBaseline: {
    styleOverrides: {
      '*': {
        scrollbarWidth: 'thin',
        scrollbarColor: 'transparent transparent',
        '&::-webkit-scrollbar': {
          width: '10px',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'transparent',
        },
        '&:hover': {
          scrollbarColor: `${palette.neutral.darker} ${palette.neutral.dark}`,
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: palette.neutral.dark,
          },
        },
        boxSizing: 'border-box',
        borderCollapse: 'collapse',
      },
    },
  },
}

export default createTheme({ palette, components, typography, zIndex, shape })
