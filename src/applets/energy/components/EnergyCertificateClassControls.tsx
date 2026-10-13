import React from 'react'
import { useTranslate } from '@tolgee/react'

import { Box, type AppBoxProps, toSxArray } from '#/common/style/theme'
import {
  ENERGY_CERTIFICATE_CLASS_CODES,
  ENERGY_CERTIFICATE_CLASS_COLORS,
  ENERGY_CERTIFICATE_INACTIVE_COLOR,
} from '../layers/energyCertificateLayerConf'
import type { EnergyCertificateClassCode } from '../layers/energyCertificateLayerConf'
import { useAppletStore } from '../state/appletStore'

type EnergyCertificateClassControlsVariant = 'desktop' | 'mobile'
type EnergyCertificateClassControlsOrientation = 'horizontal' | 'vertical'

type Props = {
  variant?: EnergyCertificateClassControlsVariant
  orientation?: EnergyCertificateClassControlsOrientation
  sx?: AppBoxProps['sx']
}

const DESKTOP_ACTIVE_TILE_BACKGROUND = '#F4F4F4'
const MOBILE_ACTIVE_TILE_BACKGROUND = '#4F4F4F'
const PolymorphicBox = Box as React.ElementType

const getClassButtonAriaLabel = ({
  layerLabel,
  classCode,
}: {
  layerLabel: string
  classCode: EnergyCertificateClassCode
}) => `${layerLabel} ${classCode}`

const EnergyCertificateClassControls = ({
  variant = 'desktop',
  orientation = 'horizontal',
  sx,
}: Props) => {
  const { t } = useTranslate('energiakartta')
  const activeEnergyCertificateClasses = useAppletStore(
    (state) => state.activeEnergyCertificateClasses
  )
  const toggleEnergyCertificateClass = useAppletStore(
    (state) => state.toggleEnergyCertificateClass
  )
  const activeClassSet = React.useMemo(
    () => new Set(activeEnergyCertificateClasses),
    [activeEnergyCertificateClasses]
  )
  const layerLabel = t('sidebar.front_page.layers.energy_classes')
  const isMobileVariant = variant === 'mobile'
  const activeTileBackground = isMobileVariant
    ? MOBILE_ACTIVE_TILE_BACKGROUND
    : DESKTOP_ACTIVE_TILE_BACKGROUND
  const buttonSize = isMobileVariant ? '2.9375rem' : '2.875rem'
  const innerSize = isMobileVariant ? '1.958rem' : '1.917rem'

  return (
    <Box
      component="ul"
      aria-label={layerLabel}
      sx={[
        {
          m: 0,
          p: 0,
          display: 'flex',
          flexDirection: orientation === 'vertical' ? 'column' : 'row',
          gap: orientation === 'vertical' ? '0.625rem' : 0,
          listStyle: 'none',
          pointerEvents: 'auto',
        },
        ...toSxArray(sx),
      ]}
    >
      {ENERGY_CERTIFICATE_CLASS_CODES.map((classCode) => {
        const isActive = activeClassSet.has(classCode)
        const tileBackground = isActive
          ? activeTileBackground
          : ENERGY_CERTIFICATE_INACTIVE_COLOR
        const badgeBackground = isActive
          ? ENERGY_CERTIFICATE_CLASS_COLORS[classCode]
          : ENERGY_CERTIFICATE_INACTIVE_COLOR

        return (
          <Box
            key={classCode}
            component="li"
            sx={{
              width: buttonSize,
              height: buttonSize,
              flex: '0 0 auto',
            }}
          >
            <PolymorphicBox
              component="button"
              type="button"
              aria-label={getClassButtonAriaLabel({
                layerLabel,
                classCode,
              })}
              aria-pressed={isActive}
              data-energy-certificate-class={classCode}
              onClick={() => toggleEnergyCertificateClass(classCode)}
              sx={{
                width: buttonSize,
                minWidth: buttonSize,
                height: buttonSize,
                p: 0,
                border: 0,
                borderRadius: '0.3125rem',
                appearance: 'none',
                cursor: 'pointer',
                backgroundColor: tileBackground,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0px 1px 1px rgba(189, 189, 189, 0.25)',
                transition:
                  'background-color 140ms ease, box-shadow 140ms ease',
                '&:hover': {
                  boxShadow: '0px 1px 3px rgba(79, 79, 79, 0.25)',
                },
                '&:focus-visible': {
                  outline: '2px solid #075CFF',
                  outlineOffset: '0.125rem',
                },
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  width: innerSize,
                  height: innerSize,
                  borderRadius: '50%',
                  backgroundColor: badgeBackground,
                  color: isActive ? '#111111' : '#FFFFFF',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: 0,
                }}
              >
                {classCode}
              </Box>
            </PolymorphicBox>
          </Box>
        )
      })}
    </Box>
  )
}

export default EnergyCertificateClassControls
