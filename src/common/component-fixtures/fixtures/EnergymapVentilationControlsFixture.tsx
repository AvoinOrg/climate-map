import React from 'react'
import { useTranslate } from '@tolgee/react'

import type { ComponentFixture } from '#/common/component-fixtures/types'
import { Box } from '#/common/style/theme'
import { LayerToggleRowAccordion } from '#/components/common/LayerToggleRow'
import TText from '#/components/common/TText'
import VentilationAccordionContent, {
  type VentilationSwitchState,
} from 'applets/energy/components/VentilationAccordionContent'

const VentilationControls = ({
  initialState,
}: {
  initialState: VentilationSwitchState
}) => {
  const { t } = useTranslate('energiakartta')
  const [state, setState] = React.useState(initialState)
  const [expanded, setExpanded] = React.useState(true)

  return (
    <Box
      sx={{ width: 320, maxWidth: '100%', p: 2, backgroundColor: '#f4f4f4' }}
    >
      <LayerToggleRowAccordion
        label={
          <TText
            keyName="sidebar.front_page.layers.ventilation"
            ns="energiakartta"
          />
        }
        ariaLabel={t('sidebar.front_page.aria.toggle_ventilation')}
        status={expanded ? 'visible' : 'hidden'}
        expanded={expanded}
        onToggle={() => setExpanded((value) => !value)}
      >
        <VentilationAccordionContent
          ventilationSwitchState={state}
          onVentilationSwitchChange={(id) => (event) => {
            const checked = event.target.checked
            setState((current) => ({ ...current, [id]: checked }))
          }}
        />
      </LayerToggleRowAccordion>
    </Box>
  )
}

export const energymapVentilationControlsFixture: ComponentFixture = {
  id: 'energymap-ventilation-controls',
  label: 'Energiakartta ventilation controls',
  description: 'Four canonical ventilation categories in the shared accordion.',
  sourceGlobs: [
    'src/applets/energy/components/VentilationAccordionContent.tsx',
    'src/applets/energy/pages/EnergyHomePage.tsx',
    'src/applets/energy/layers/ventilationLayerConf.ts',
    'src/common/component-fixtures/fixtures/EnergymapVentilationControlsFixture.tsx',
  ],
  canvasSx: { p: 0, minWidth: 0 },
  states: [
    {
      id: 'all-on',
      label: 'All on',
      render: () => (
        <VentilationControls
          initialState={{
            mechanical: true,
            gravity: true,
            other: true,
            no_info: true,
          }}
        />
      ),
    },
    {
      id: 'mixed',
      label: 'Mixed',
      render: () => (
        <VentilationControls
          initialState={{
            mechanical: true,
            gravity: false,
            other: false,
            no_info: true,
          }}
        />
      ),
    },
    {
      id: 'all-off',
      label: 'All off',
      render: () => (
        <VentilationControls
          initialState={{
            mechanical: false,
            gravity: false,
            other: false,
            no_info: false,
          }}
        />
      ),
    },
  ],
}
