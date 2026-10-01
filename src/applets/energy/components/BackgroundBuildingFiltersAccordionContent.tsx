import React from 'react'
import { useTranslate } from '@tolgee/react'

import { EnergyAreaScope } from 'applets/energy/components/EnergyAreaControls'
import { Box } from '#/common/style/theme'
import type { DropDownValueChangeEvent } from '#/components/common/DropDownSelect'
import DropDownSelectInset from '#/components/common/DropDownSelectInset'
import DropDownSelectWithLabel from '#/components/common/DropDownSelectWithLabel'
import SwitchWithLabel from '#/components/common/SwitchWithLabel'
import type { SelectOption } from '#/common/types/general'
import {
  ENERGYMAP_BUILDING_TYPE_CODES,
  ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
  ENERGYMAP_CONSTRUCTION_DECADE_OPTIONS,
  ENERGYMAP_CONSTRUCTION_YEAR_FILTER_ANY,
} from '../layers/buildingPolygonsLayerConf'
import type { EnergymapBuildingTypeFilter } from '../layers/buildingPolygonsLayerConf'
import { useAppletStore } from '../state/appletStore'

const CONTROL_TEXT_SX = {
  minWidth: 0,
  color: '#111111',
  fontSize: '0.5625rem',
  fontWeight: 400,
  lineHeight: '0.875rem',
  letterSpacing: '0.1em',
  whiteSpace: 'normal',
  overflowWrap: 'break-word',
}

const DROPDOWN_LABEL_SX = {
  color: '#111111',
  fontSize: '0.625rem',
  fontWeight: 700,
  lineHeight: '1.125rem',
  letterSpacing: '0.1em',
}

const SWITCH_SX = {
  width: '100%',
}

const SWITCH_CONTROL_SX = {
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: '#075CFF',
  },
}

const SWITCH_LABEL_SX = {
  ...CONTROL_TEXT_SX,
  ml: '0.625rem',
}

const BackgroundBuildingFiltersAccordionContent = () => {
  const disabled = useAppletStore((state) => state.effectiveGeography !== 'buildings')
  const { t } = useTranslate('energiakartta')
  const buildingTypeFilter = useAppletStore((state) => state.buildingTypeFilter)
  const selectedConstructionDecade = useAppletStore(
    (state) => state.selectedConstructionDecade
  )
  const showBuildingsFromSelectedDecade = useAppletStore(
    (state) => state.showBuildingsFromSelectedDecade
  )
  const showOnlySelectedDecade = useAppletStore(
    (state) => state.showOnlySelectedDecade
  )
  const setBuildingTypeFilter = useAppletStore(
    (state) => state.setBuildingTypeFilter
  )
  const setSelectedConstructionDecade = useAppletStore(
    (state) => state.setSelectedConstructionDecade
  )
  const setShowBuildingsFromSelectedDecade = useAppletStore(
    (state) => state.setShowBuildingsFromSelectedDecade
  )
  const setShowOnlySelectedDecade = useAppletStore(
    (state) => state.setShowOnlySelectedDecade
  )

  const buildingTypeOptions = React.useMemo<SelectOption[]>(
    () => [
      {
        value: ENERGYMAP_BUILDING_TYPE_FILTER_ALL,
        label: t('sidebar.background_filters.building_types.all'),
      },
      ...ENERGYMAP_BUILDING_TYPE_CODES.map((code) => ({
        value: code,
        label: t(`sidebar.background_filters.building_types.${code}`),
      })),
    ],
    [t]
  )

  const decadeOptions = React.useMemo<SelectOption[]>(
    () => [
      {
        value: ENERGYMAP_CONSTRUCTION_YEAR_FILTER_ANY,
        label: t('sidebar.background_filters.construction_year.any'),
      },
      ...ENERGYMAP_CONSTRUCTION_DECADE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
      })),
    ],
    [t]
  )
  const constructionDecadeSelectValue =
    selectedConstructionDecade == null
      ? ENERGYMAP_CONSTRUCTION_YEAR_FILTER_ANY
      : String(selectedConstructionDecade)
  const hasSelectedConstructionDecade = selectedConstructionDecade != null

  const handleBuildingTypeChange = (event: DropDownValueChangeEvent) => {
    setBuildingTypeFilter(event.target.value as EnergymapBuildingTypeFilter)
  }

  const handleConstructionDecadeChange = (event: DropDownValueChangeEvent) => {
    const selectedValue = event.target.value

    if (selectedValue === ENERGYMAP_CONSTRUCTION_YEAR_FILTER_ANY) {
      setSelectedConstructionDecade(null)
      return
    }

    const selectedDecade = Number(selectedValue)

    if (Number.isNaN(selectedDecade)) {
      return
    }

    setSelectedConstructionDecade(selectedDecade)
  }

  return (
    <Box
      sx={{
        pt: '2.375rem',
        pb: '2.875rem',
        px: '0.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.625rem',
      }}
    >
      {disabled && <EnergyAreaScope />}
      <DropDownSelectWithLabel
        disabled={disabled}
        applyNegativeMargins
        value={buildingTypeFilter}
        options={buildingTypeOptions}
        onChange={handleBuildingTypeChange}
        label={t('sidebar.background_filters.building_types.label')}
        ariaLabel={t('sidebar.background_filters.building_types.aria_label')}
        headerSx={{
          px: '1rem',
          minHeight: '1.125rem',
          mb: '0.25rem',
        }}
        labelSx={DROPDOWN_LABEL_SX}
        selectSx={{
          '&.MuiOutlinedInput-root': {
            height: '1.25rem',
            backgroundColor: 'common.white',
            boxShadow: 'inset 0px 1px 2px 0px rgba(214, 214, 214, 0.3)',
          },
          '.MuiSelect-select': {
            minHeight: '1.125rem',
            py: '0 !important',
            fontSize: '0.625rem',
            letterSpacing: '0.1em',
          },
        }}
        typographySx={{
          whiteSpace: 'normal',
          overflowWrap: 'anywhere',
        }}
      />

      <DropDownSelectInset
        disabled={disabled}
        applyNegativeMargins
        value={constructionDecadeSelectValue}
        options={decadeOptions}
        onChange={handleConstructionDecadeChange}
        label={t('sidebar.background_filters.construction_year.label')}
        ariaLabel={t('sidebar.background_filters.construction_year.aria_label')}
        sx={{ gap: '1.875rem' }}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          px: '0.25rem',
        }}
      >
        <SwitchWithLabel
          checked={showBuildingsFromSelectedDecade}
          ariaLabel={t(
            'sidebar.background_filters.construction_year.show_from_decade'
          )}
          inputProps={{ role: 'switch' }}
          onChange={(event) =>
            setShowBuildingsFromSelectedDecade(event.target.checked)
          }
          disabled={disabled || !hasSelectedConstructionDecade}
          sx={SWITCH_SX}
          controlSx={SWITCH_CONTROL_SX}
          labelSx={SWITCH_LABEL_SX}
        >
          {t('sidebar.background_filters.construction_year.show_from_decade')}
        </SwitchWithLabel>
        <SwitchWithLabel
          checked={showOnlySelectedDecade}
          ariaLabel={t(
            'sidebar.background_filters.construction_year.show_only_decade'
          )}
          inputProps={{ role: 'switch' }}
          onChange={(event) => setShowOnlySelectedDecade(event.target.checked)}
          disabled={disabled || !hasSelectedConstructionDecade}
          sx={SWITCH_SX}
          controlSx={SWITCH_CONTROL_SX}
          labelSx={SWITCH_LABEL_SX}
        >
          {t('sidebar.background_filters.construction_year.show_only_decade')}
        </SwitchWithLabel>
      </Box>
    </Box>
  )
}

export default BackgroundBuildingFiltersAccordionContent
