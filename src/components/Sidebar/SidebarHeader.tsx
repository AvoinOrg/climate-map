import React from 'react'
import {
  SIDEBAR_HEADER_EDGE_INSET_REM,
  SIDEBAR_HEADER_TITLE_PADDING_X,
} from '#/common/style/theme/constants'
import type { AppBoxProps } from '#/common/style/theme/system'
import { Box, toSxArray } from '#/common/style/theme/system'

type SidebarStyleProps = AppBoxProps['sx']

const SIDEBAR_HEADER_HERO_EDGE_INSET = {
  mobile: `${SIDEBAR_HEADER_EDGE_INSET_REM}rem`,
  desktop: `${SIDEBAR_HEADER_EDGE_INSET_REM}rem`,
} as const

interface Props {
  children?: React.ReactNode
  title: React.ReactNode
  backgroundImage?: string
  backgroundSx?: SidebarStyleProps
  titlePaddingX?: { mobile: string; desktop: string }
  sx?: SidebarStyleProps
}

const SidebarHeader = ({
  children,
  title,
  backgroundImage,
  backgroundSx,
  titlePaddingX = SIDEBAR_HEADER_TITLE_PADDING_X,
  sx,
}: Props) => {
  return (
    <Box
      className="sidebar-header"
      sx={[
        {
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          px: SIDEBAR_HEADER_HERO_EDGE_INSET,
          pt: SIDEBAR_HEADER_HERO_EDGE_INSET,
          pb: { mobile: '0.375rem', desktop: '0.5rem' },
          color: 'neutral.darker',
          zIndex: (theme) => (theme.zIndex?.drawer ?? 1200) + 4,
        },
        ...toSxArray(sx),
      ]}
    >
      <Box
        sx={{
          position: 'relative',
          minHeight: { mobile: '5.125rem', desktop: '5.625rem' },
          borderRadius: '0.625rem',
          overflow: 'hidden',
          backgroundColor: '#f4f4f4',
          boxSizing: 'border-box',
        }}
      >
        <Box
          sx={[
            {
              position: 'absolute',
              inset: 0,
              backgroundImage: backgroundImage
                ? `url(${backgroundImage})`
                : 'linear-gradient(90deg, #f4f4f4 0%, #f4f4f4 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            },
            ...toSxArray(backgroundSx),
          ]}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(90deg, rgba(244,244,244,1) 0%, rgba(244,244,244,0.98) 24%, rgba(244,244,244,0.48) 46%, rgba(244,244,244,0) 72%)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            display: 'flex',
            alignItems: 'center',
            px: titlePaddingX,
          }}
        >
          <Box
            component="h3"
            sx={{
              m: 0,
              color: '#111111',
              textAlign: 'left',
              whiteSpace: 'normal',
              lineHeight: '1.125rem',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {title}
          </Box>
        </Box>
        {children != null && (
          <Box
            sx={{
              position: 'absolute',
              left: titlePaddingX,
              right: titlePaddingX,
              bottom: { mobile: '0.5rem', desktop: '0.625rem' },
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {children}
          </Box>
        )}
      </Box>
    </Box>
  )
}

export default SidebarHeader
