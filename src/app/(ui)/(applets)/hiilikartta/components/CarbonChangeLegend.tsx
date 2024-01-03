import React, { useEffect, useRef, useState } from 'react'
import { Box, SxProps, Theme, Typography } from '@mui/material'
import { T, useTranslate } from '@tolgee/react'

import {
  CARBON_CHANGE_COLORS,
  CARBON_CHANGE_NO_DATA_COLOR,
} from '../common/constants'

const NUMBER_OF_ITEMS = CARBON_CHANGE_COLORS.length + 1
const FLEX_BASIS = 100 / NUMBER_OF_ITEMS + '%'

type Props = { sx?: SxProps<Theme> }

const CarbonChangeLegend = ({ sx }: Props) => {
  const { t } = useTranslate('hiilikartta')
  const noChangeTextRef = useRef<HTMLDivElement>(null)

  const [thirdTextRight, setThirdTextRight] = useState('0')
  const [fourthTextLeft, setFourthTextLeft] = useState('0')

  useEffect(() => {
    if (noChangeTextRef.current) {
      const middleTextWidth = noChangeTextRef.current.offsetWidth
      const middleTextPosition = (100 / NUMBER_OF_ITEMS) * 5
      setThirdTextRight(`calc(${middleTextPosition}% + 1.5rem)`)
      setFourthTextLeft(
        `calc(${middleTextPosition}% + ${middleTextWidth}px + 1.5rem)`
      )
    }
  }, [])

  return (
    <Box
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          width: '100%',
        }}
      >
        <LegendItem
          color={CARBON_CHANGE_NO_DATA_COLOR}
          label={t('report.carbon_change_legend.no_data')}
        ></LegendItem>
        {CARBON_CHANGE_COLORS.map((colorObj, index) => (
          <LegendItem
            color={colorObj.color}
            key={index}
            label={`${colorObj.min} – ${
              colorObj.max < 0 ? '(' + colorObj.max + ')' : colorObj.max
            }`}
          ></LegendItem>
        ))}
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          position: 'relative',
          width: '100%',
          mt: 1.5,
          height: '1.5rem',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0, // Aligns to the far left
            typography: 'body7',
            fontSize: '0.5rem',
            lineHeight: 'normal',
            letterSpacing: '0.05rem',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <b>
            <T
              ns={'hiilikartta'}
              keyName={'report.carbon_change_legend.title'}
            ></T>
          </b>
          <Box sx={{ mt: 0.7 }}>
            <T
              ns={'hiilikartta'}
              keyName={'report.carbon_change_legend.unit'}
            ></T>
          </Box>
        </Box>
        <Typography
          ref={noChangeTextRef}
          sx={{
            position: 'absolute',
            top: 1,
            left: `calc((100% / ${NUMBER_OF_ITEMS}) * 5)`, // Aligns with the 6th item
            typography: 'body1',
            fontSize: '0.5rem',
            lineHeight: 'normal',
            letterSpacing: '0.05rem',
          }}
        >
          <T
            ns={'hiilikartta'}
            keyName={'report.carbon_change_legend.no_change'}
          ></T>
        </Typography>
        <Typography
          sx={{
            position: 'absolute',
            top: 1,
            right: thirdTextRight,
            left: 'auto',
            typography: 'body1',
            fontSize: '0.5rem',
            lineHeight: 'normal',
            letterSpacing: '0.05rem',
            color: '#C54032',
          }}
        >
          <T
            ns={'hiilikartta'}
            keyName={'report.carbon_change_legend.stores_shrink'}
          ></T>
          {' <<'}
        </Typography>
        <Typography
          sx={{
            position: 'absolute',
            top: 1,
            left: fourthTextLeft,
            typography: 'body1',
            fontSize: '0.5rem',
            lineHeight: 'normal',
            letterSpacing: '0.05rem',
            color: '#568175',
          }}
        >
          {'>> '}
          <T
            ns={'hiilikartta'}
            keyName={'report.carbon_change_legend.stores_expand'}
          ></T>
        </Typography>
      </Box>
    </Box>
  )
}

const LegendItem = ({ color, label }: { color: string; label: string }) => {
  return (
    <Box
      sx={{
        flexGrow: 0,
        flexShrink: 0,
        flexBasis: FLEX_BASIS,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography
        sx={{
          typography: 'body2',
          fontSize: '0.625rem',
          fontStyle: 'normal',
          lineHeight: 'normal',
          letterSpacing: '0.0625rem',
        }}
      >
        {label}
      </Typography>
      <Box
        sx={{
          mt: '0.44rem',
          width: '100%',
          height: '0.625rem',
          backgroundColor: color,
        }}
      ></Box>
    </Box>
  )
}

export default CarbonChangeLegend
