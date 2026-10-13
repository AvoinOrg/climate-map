import React from 'react'
import { useTranslate } from '@tolgee/react'

import { Box } from '#/common/style/theme'
import SquishedSwitchWithLabel from '#/components/common/SquishedSwitchWithLabel'
import TText from '#/components/common/TText'
import {
  ENERGYMAP_VENTILATION_CATEGORY_VALUES,
  type EnergymapVentilationCategory,
} from 'applets/energy/common/ventilation'
import { VENTILATION_CATEGORY_COLORS } from 'applets/energy/layers/ventilationLayerConf'

const ACCORDION_TEXT_SX = {
  color: '#111111',
  fontSize: '0.625rem',
  fontWeight: 400,
  lineHeight: '1.125rem',
  letterSpacing: '0.1em',
}

const VENTILATION_SWITCH_ITEMS = ENERGYMAP_VENTILATION_CATEGORY_VALUES.map(
  (category) => ({
    id: category,
    keyName: `sidebar.front_page.ventilation.legend.${category}`,
    color: VENTILATION_CATEGORY_COLORS[category],
  })
)

export type VentilationSwitchState = Record<
  EnergymapVentilationCategory,
  boolean
>

const VentilationAccordionContent = ({
  ventilationSwitchState,
  onVentilationSwitchChange,
}: {
  ventilationSwitchState: VentilationSwitchState
  onVentilationSwitchChange: (
    id: EnergymapVentilationCategory
  ) => React.ChangeEventHandler<HTMLInputElement>
}) => {
  const { t } = useTranslate('energiakartta')

  return (
    <Box
      sx={{
        pt: '2.125rem',
        mx: '2rem',
        maxWidth: { mobile: 'none', desktop: '15.875rem' },
      }}
    >
      <Box
        component="p"
        sx={{
          ...ACCORDION_TEXT_SX,
          m: 0,
          mb: '2.5rem',
        }}
      >
        <TText
          keyName="sidebar.front_page.ventilation.body"
          ns="energiakartta"
        />
      </Box>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          // 50px row pitch, with larger label hit areas on mobile.
          gap: { mobile: '0.375rem', desktop: '2.25rem' },
          listStyle: 'none',
        }}
      >
        {VENTILATION_SWITCH_ITEMS.map(({ id, keyName, color }) => (
          <Box
            key={id}
            component="li"
            sx={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              minHeight: '0.875rem',
            }}
          >
            <SquishedSwitchWithLabel
              checked={ventilationSwitchState[id]}
              checkedTrackColor={color}
              ariaLabel={t(keyName)}
              onChange={onVentilationSwitchChange(id)}
              onFocus={(event) => {
                const input = event.currentTarget
                // Finish native focus scrolling before revealing the full row.
                requestAnimationFrame(() => {
                  if (input.matches(':focus-visible')) {
                    input.closest('label')?.scrollIntoView({
                      block: 'center',
                      inline: 'nearest',
                      behavior: 'instant',
                    })
                  }
                })
              }}
              sx={{
                width: '100%',
                minHeight: { mobile: '2.75rem', desktop: '0.875rem' },
              }}
              labelSx={{
                ...ACCORDION_TEXT_SX,
                fontSize: '0.6875rem',
                lineHeight: '0.875rem',
              }}
            >
              <TText keyName={keyName} ns="energiakartta" />
            </SquishedSwitchWithLabel>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

export default VentilationAccordionContent
