import { Theme } from '@mui/material'

// Used for resolving color strings in components,
// where MUI theme might not work directly
export const resolveColor = (color: string, theme: Theme) => {
  const parts = color.split('.')
  if (parts.length === 2) {
    const [colorKey, shade] = parts
    const colorGroup = theme.palette[colorKey as keyof Theme['palette']]

    if (colorGroup && typeof colorGroup === 'object' && shade in colorGroup) {
      return colorGroup[shade as keyof typeof colorGroup]
    }
  }

  return color
}

let textMeasurementCanvas: HTMLCanvasElement | null = null

export const getTextWidth = (text: string, font: string): number => {
  if (!textMeasurementCanvas) {
    textMeasurementCanvas = document.createElement('canvas')
  }
  const context = textMeasurementCanvas.getContext('2d')
  if (!context) {
    return 0 // Fallback in case the context is not available
  }

  context.font = font
  const metrics = context.measureText(text)
  return metrics.width
}
