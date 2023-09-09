import { createTheme, Shadows, ThemeOptions } from '@mui/material/styles'
import { TypographyOptions } from '@mui/material/styles/createTypography'
import { Arimo } from '@next/font/google'
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
    h8?: React.CSSProperties
    h9?: React.CSSProperties
    body7?: React.CSSProperties
  }
}

const defaultTheme = createTheme()

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
  primary: {
    main: '#C7C9B8',
    dark: '#AFB29A',
    light: '#D7D9CC',
    lighter: '#EBECE6',
  },
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
  modal: 1500,
  snackbar: 1600,
  drawer: 1400,
  appBar: 1400,
  mobileStepper: 1000,
  popup: 1500,
  tooltip: 1450,
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
  },
  h6: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: '1.625rem',
    letterSpacing: '0.0875rem',
  },
  h7: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: '1.625rem',
    letterSpacing: '0.0875rem',
  },
  h8: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 400,
    lineHeight: 'normal',
    letterSpacing: '0.0875rem',
  },
  h9: {
    fontFamily: fonts.primary,
    fontSize: '0.875rem',
    fontWeight: 700,
    lineHeight: 'normal',
    letterSpacing: '0.0875rem',
  },
}

const defaultShadows: ThemeOptions['shadows'] = [...defaultTheme.shadows]

const shadows = defaultShadows.map(() => 'none') as Shadows

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
  MuiButton: {
    variants: [
      {
        props: { variant: 'contained' as 'contained' },
        style: {
          backgroundColor: palette.neutral.light, // Replace with your desired color for the button
          borderColor: palette.neutral.main,
          color: palette.neutral.darker,
        },
      },
      {
        props: { variant: 'outlined' as 'outlined' },
        style: {
          backgroundColor: palette.neutral.light, // Replace with your desired color for the button
          borderColor: palette.neutral.main,
          color: palette.neutral.darker,
          boxShadow: '1px 1px 7px 0px #EEECEC',
        },
      },
    ],
    styleOverrides: {
      root: {
        textTransform: 'none' as 'none',
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

export default createTheme({
  palette,
  components,
  typography,
  zIndex,
  shape,
  shadows,
})
