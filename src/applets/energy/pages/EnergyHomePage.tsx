import EnergyAreaBackButton from 'applets/energy/components/EnergyAreaBackButton'
import React from 'react'
import EnergyAreaControls from 'applets/energy/components/EnergyAreaControls'
import EnergyAreaDetailPanel from 'applets/energy/components/EnergyAreaDetailPanel'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'
import { useTranslate } from '@tolgee/react'

import { MAP_BOTTOM_LEFT_FLOATING_CONTROLS_SLOT } from '#/common/constants/map'
import { useVisibleLayerGroupIds } from '#/common/hooks/map/useVisibleLayerGroupIds'
import { useIsMobile } from '#/common/hooks/ui/useIsMobile'
import { useAppParams } from '#/common/navigation/navigation'
import { Box } from '#/common/style/theme'
import { useMapStore, useUIStore } from '#/common/store'
import { LayerToggleRowAccordion } from '#/components/common/LayerToggleRow'
import AppTooltip, { type AppTooltipSide } from '#/components/common/AppTooltip'
import SquishedSwitchWithLabel from '#/components/common/SquishedSwitchWithLabel'
import TText from '#/components/common/TText'
import { IntoSlot } from '#/components/context/slotsContext'
import {
  IntoSidebarPanelExtensionActionRailSlot,
  IntoSidebarPanelExtensionPanelSlot,
  IntoSidebarFooterSlot,
  IntoSidebarHeaderSlot,
  SidebarPanelExtensionProvider,
  SidebarContentBox,
  SidebarHeader,
} from '#/components/Sidebar'
import VentilationAccordionContent, {
  type VentilationSwitchState,
} from 'applets/energy/components/VentilationAccordionContent'
import EnergyCertificateClassControls from '../components/EnergyCertificateClassControls'
import EnergyClassesAccordionContent from '../components/EnergyClassesAccordionContent'
import {
  BuildingInfoActionRail,
  BuildingInfoTabPages,
} from '../components/BuildingInfoPanel'
import { createEnergymapBuildingInfoPresentation } from '../common/buildingInfo'
import {
  deriveEnergymapBuildingInfoPanelTopology,
  resolveEnergymapBuildingInfoTab,
} from '../common/buildingInfoPanelTopology'
import type {
  BuildingInfoDesktopMode,
  BuildingInfoTabId,
} from '../common/buildingInfoPanelTopology'
import {
  getEnergymapBuildingInfoDesktopMinWidthPx,
  getEnergymapBuildingInfoPanelRuntimeOptions,
} from '../common/buildingInfoPanelRuntime'
import {
  areEnergymapSelectedBuildingsEqual,
  toEnergymapSelectedBuilding,
} from '../common/utils'
import {
  ENERGYMAP_VENTILATION_CATEGORY_VALUES,
  type EnergymapVentilationCategory,
} from '../common/ventilation'
import {
  ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID,
  ENERGYMAP_BUILDING_POLYGONS_LAYER_IDS,
  ENERGYMAP_SHARED_BUILDING_LAYER_IDS,
  combineMapFilters,
  getEnergymapBuildingFilter,
} from '../layers/buildingPolygonsLayerConf'
import {
  ENERGYMAP_ENERGY_CERTIFICATE_FILL_OPACITY,
  ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
  ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS,
  ENERGYMAP_ENERGY_CERTIFICATE_OUTLINE_LAYER_ID,
  ENERGYMAP_ENERGY_CERTIFICATE_OUTLINE_OPACITY,
  getEnergyCertificateFillColorExpression,
} from '../layers/energyCertificateLayerConf'
import {
  ENERGYMAP_HEATING_FILL_OPACITY,
  ENERGYMAP_HEATING_FILL_LAYER_ID,
  ENERGYMAP_HEATING_LAYER_IDS,
  ENERGYMAP_HEATING_OUTLINE_LAYER_ID,
  ENERGYMAP_HEATING_OUTLINE_OPACITY,
  HEATING_ENERGY_SOURCE_COLORS,
  HeatingEnergySourceFilterKey,
  getHeatingEnergySourceFilter,
} from '../layers/heatingLayerConf'
import {
  ENERGYMAP_VENTILATION_FILL_LAYER_ID,
  ENERGYMAP_VENTILATION_FILL_OPACITY,
  ENERGYMAP_VENTILATION_LAYER_IDS,
  ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
  ENERGYMAP_VENTILATION_OUTLINE_OPACITY,
  getVentilationCategoryFilter,
} from '../layers/ventilationLayerConf'
import { listedBackgroundBuildingFiltersAccordion } from '../common/constants'
import { useAppletStore } from '../state/appletStore'

const SIDEBAR_CONTENT_VERTICAL_PADDING = {
  mobile: '2.25rem',
  desktop: '3.0625rem',
}

const ACCORDION_TEXT_SX = {
  color: '#111111',
  fontSize: '0.625rem',
  fontWeight: 400,
  lineHeight: '1.125rem',
  letterSpacing: '0.1em',
}

const HEATING_SWITCH_ITEMS = [
  {
    id: 'geothermal',
    keyName: 'sidebar.front_page.heating.legend.geothermal',
    color: HEATING_ENERGY_SOURCE_COLORS.geothermal,
  },
  {
    id: 'districtHeating',
    keyName: 'sidebar.front_page.heating.legend.district_heating',
    color: HEATING_ENERGY_SOURCE_COLORS.districtHeating,
  },
  {
    id: 'electricity',
    keyName: 'sidebar.front_page.heating.legend.electricity',
    color: HEATING_ENERGY_SOURCE_COLORS.electricity,
  },
  {
    id: 'solar',
    keyName: 'sidebar.front_page.heating.legend.solar',
    color: HEATING_ENERGY_SOURCE_COLORS.solar,
  },
  {
    id: 'other',
    keyName: 'sidebar.front_page.heating.legend.other',
    color: HEATING_ENERGY_SOURCE_COLORS.other,
  },
] as const satisfies readonly {
  id: HeatingEnergySourceFilterKey
  keyName: string
  color: string
}[]

type HeatingSwitchKey = (typeof HEATING_SWITCH_ITEMS)[number]['id']

type HeatingSwitchState = Record<HeatingSwitchKey, boolean>

const INITIAL_HEATING_SWITCH_STATE = HEATING_SWITCH_ITEMS.reduce(
  (state, { id }) => ({
    ...state,
    [id]: true,
  }),
  {} as HeatingSwitchState
)

const INITIAL_VENTILATION_SWITCH_STATE =
  ENERGYMAP_VENTILATION_CATEGORY_VALUES.reduce(
    (state, id) => ({
      ...state,
      [id]: true,
    }),
    {} as VentilationSwitchState
  )

type EnergymapMainThematicMode =
  | 'energyCertificates'
  | 'heating'
  | 'ventilation'

const ENERGY_CERTIFICATE_THEMATIC_MODE: EnergymapMainThematicMode =
  'energyCertificates'
const HEATING_THEMATIC_MODE: EnergymapMainThematicMode = 'heating'
const VENTILATION_THEMATIC_MODE: EnergymapMainThematicMode = 'ventilation'
const INACTIVE_THEMATIC_OPACITY = 0
const PolymorphicBox = Box as React.ElementType

type PageTooltipSide = AppTooltipSide
type PageTooltipTriggerProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  'color'
> & {
  ref?: React.Ref<HTMLElement>
}

const useBreakpointMatch = (query: string) => {
  const [matches, setMatches] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const mediaQueryList = window.matchMedia(query)
    const updateMatches = () => setMatches(mediaQueryList.matches)

    updateMatches()
    if (mediaQueryList.addEventListener) {
      mediaQueryList.addEventListener('change', updateMatches)
    } else {
      mediaQueryList.addListener(updateMatches)
    }

    return () => {
      if (mediaQueryList.removeEventListener) {
        mediaQueryList.removeEventListener('change', updateMatches)
      } else {
        mediaQueryList.removeListener(updateMatches)
      }
    }
  }, [query])

  return matches
}

const PageTooltip = ({
  title,
  side = 'top',
  children,
}: {
  title: React.ReactNode
  side?: PageTooltipSide
  children: (props: PageTooltipTriggerProps) => React.ReactElement
}) => (
  <AppTooltip
    title={title}
    side={side}
    delay={0}
    closeDelay={0}
    popupSx={{ px: 1 }}
  >
    {(triggerProps) => children(triggerProps as PageTooltipTriggerProps)}
  </AppTooltip>
)

const SidebarFooterAction = ({
  tooltip,
  label,
  mobileActionCount = 0,
}: {
  tooltip: string
  label: string
  mobileActionCount?: number
}) => {
  const mobileRightPaddingPx =
    mobileActionCount === 0
      ? undefined
      : 90 +
        mobileActionCount * 45 +
        Math.max(0, mobileActionCount - 1) * 10 +
        8

  return (
    <PageTooltip title={tooltip} side="top">
      {({ className, ...tooltipTriggerProps }) => (
        <Box
          {...tooltipTriggerProps}
          className={[className, 'energymap-sidebar-footer-action']
            .filter(Boolean)
            .join(' ')}
          component="span"
          role="button"
          tabIndex={0}
          aria-disabled="true"
          aria-label={label}
          data-mobile-building-info-action-count={mobileActionCount}
          sx={{
            width: '100%',
            height: '5rem',
            pl: { mobile: '1.625rem', desktop: '1.625rem' },
            pr: {
              mobile:
                mobileRightPaddingPx == null
                  ? '1.625rem'
                  : `${mobileRightPaddingPx}px`,
              desktop: '1.625rem',
            },
            display: 'flex',
            alignItems: 'center',
            gap: '1.25rem',
            borderRadius: { mobile: 0, desktop: '6px 6px 10px 10px' },
            background:
              'linear-gradient(90deg, #f8fff2 0%, #d9ffbd 48%, #b0ff6b 100%)',
            color: '#111111',
            cursor: 'not-allowed',
            opacity: 0.72,
            boxShadow: '0px 1px 1px rgba(189, 189, 189, 0.25)',
            '&:focus-visible': {
              outline: '2px solid #111111',
              outlineOffset: '-0.375rem',
            },
          }}
        >
          <PolymorphicBox
            component="img"
            src="/files/img/energiakartta/sidebar/edit-building-details.svg"
            alt=""
            aria-hidden="true"
            sx={{
              width: '1.90625rem',
              height: '1.3125rem',
              flexShrink: 0,
            }}
          />
          <Box
            component="span"
            sx={{
              minWidth: 0,
              color: '#111111',
              fontSize: '0.6875rem',
              fontWeight: 700,
              lineHeight: '0.8125rem',
              letterSpacing: '0.1em',
            }}
          >
            <TText
              keyName="sidebar.front_page.footer.edit_building_details"
              ns="energiakartta"
            />
          </Box>
        </Box>
      )}
    </PageTooltip>
  )
}

const HeatingAccordionContent = ({
  heatingSwitchState,
  onHeatingSwitchChange,
}: {
  heatingSwitchState: HeatingSwitchState
  onHeatingSwitchChange: (
    id: HeatingSwitchKey
  ) => React.ChangeEventHandler<HTMLInputElement>
}) => {
  const { t } = useTranslate('energiakartta')
  const disabled = useAppletStore(
    (state) => state.effectiveGeography !== 'buildings'
  )

  return (
    <Box
      sx={{
        pt: '2.125rem',
        mx: '2rem',
        maxWidth: '15.875rem',
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
        <TText keyName="sidebar.front_page.heating.body" ns="energiakartta" />
      </Box>
      <Box
        component="ul"
        sx={{
          m: 0,
          p: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          listStyle: 'none',
        }}
      >
        {HEATING_SWITCH_ITEMS.map(({ id, keyName, color }) => (
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
              disabled={disabled}
              checked={heatingSwitchState[id]}
              checkedTrackColor={color}
              ariaLabel={t(keyName)}
              onChange={onHeatingSwitchChange(id)}
              sx={{ width: '100%' }}
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

type EnergyHomePageProps = {
  locale?: string
}

type BuildingInfoShellState = {
  buildingKey: string | null
  requestedTabId: BuildingInfoTabId
  isCollapsed: boolean
}

const INITIAL_BUILDING_INFO_SHELL_STATE: BuildingInfoShellState = {
  buildingKey: null,
  requestedTabId: 'basic',
  isCollapsed: false,
}

const EnergyHomePage = ({ locale: localeProp }: EnergyHomePageProps) => {
  const { t } = useTranslate('energiakartta')
  const params = useAppParams<{ locale?: string | string[] }>()
  const locale =
    localeProp ?? (typeof params.locale === 'string' ? params.locale : 'fi')
  const areaRuntime = useEnergyAreaRuntime()
  const buildingApplicable = useAppletStore(
    (state) => state.effectiveGeography === 'buildings'
  )
  const hasAreaInfo = !!areaRuntime.request
  const setFilter = useMapStore((state) => state.setFilter)
  const setLayoutProperty = useMapStore((state) => state.setLayoutProperty)
  const setPaintProperty = useMapStore((state) => state.setPaintProperty)
  const enableLayerGroup = useMapStore((state) => state.enableLayerGroup)
  const setSelectedFeatures = useMapStore((state) => state.setSelectedFeatures)
  const selectedFeatures = useMapStore((state) => state.selectedFeatures)
  const isMobile = useIsMobile('desktop')
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const setIsSidebarOpen = useUIStore((state) => state.setIsSidebarOpen)
  const isSharedBuildingLayerGroupRegistered = useMapStore((state) =>
    ENERGYMAP_SHARED_BUILDING_LAYER_IDS.every((layerId) =>
      Boolean(
        state._layerGroups[ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID]?.layers[
          layerId
        ]
      )
    )
  )
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
  const activeEnergyCertificateClasses = useAppletStore(
    (state) => state.activeEnergyCertificateClasses
  )
  const selectedBuilding = useAppletStore((state) => state.selectedBuilding)
  const setSelectedBuilding = useAppletStore(
    (state) => state.setSelectedBuilding
  )
  const clearSelectedBuilding = useAppletStore(
    (state) => state.clearSelectedBuilding
  )
  const visibleLayerGroupIds = useVisibleLayerGroupIds()
  const [heatingSwitchState, setHeatingSwitchState] = React.useState(
    INITIAL_HEATING_SWITCH_STATE
  )
  const [ventilationSwitchState, setVentilationSwitchState] = React.useState(
    INITIAL_VENTILATION_SWITCH_STATE
  )
  const [activeThematicMode, setActiveThematicMode] =
    React.useState<EnergymapMainThematicMode | null>(null)
  const [buildingInfoShellState, setBuildingInfoShellState] =
    React.useState<BuildingInfoShellState>(INITIAL_BUILDING_INFO_SHELL_STATE)
  const energyCertificateFillColorExpression = React.useMemo(
    () =>
      getEnergyCertificateFillColorExpression(activeEnergyCertificateClasses),
    [activeEnergyCertificateClasses]
  )
  const activeHeatingFilterKeys = React.useMemo<HeatingEnergySourceFilterKey[]>(
    () =>
      HEATING_SWITCH_ITEMS.filter(({ id }) => heatingSwitchState[id]).map(
        ({ id }) => id
      ),
    [heatingSwitchState]
  )
  const heatingFilter = React.useMemo(
    () => getHeatingEnergySourceFilter(activeHeatingFilterKeys),
    [activeHeatingFilterKeys]
  )
  const activeVentilationCategories = React.useMemo<
    EnergymapVentilationCategory[]
  >(
    () =>
      ENERGYMAP_VENTILATION_CATEGORY_VALUES.filter(
        (id) => ventilationSwitchState[id]
      ),
    [ventilationSwitchState]
  )
  const ventilationFilter = React.useMemo(
    () => getVentilationCategoryFilter(activeVentilationCategories),
    [activeVentilationCategories]
  )
  const buildingFilter = React.useMemo(
    () =>
      getEnergymapBuildingFilter({
        buildingTypeFilter,
        selectedConstructionDecade,
        showBuildingsFromSelectedDecade,
        showOnlySelectedDecade,
      }),
    [
      buildingTypeFilter,
      selectedConstructionDecade,
      showBuildingsFromSelectedDecade,
      showOnlySelectedDecade,
    ]
  )
  const combinedHeatingFilter = React.useMemo(
    () => combineMapFilters([buildingFilter, heatingFilter]),
    [buildingFilter, heatingFilter]
  )
  const combinedVentilationFilter = React.useMemo(
    () => combineMapFilters([buildingFilter, ventilationFilter]),
    [buildingFilter, ventilationFilter]
  )
  const selectedEnergymapBuilding = React.useMemo(
    () =>
      (buildingApplicable ? selectedFeatures : [])
        .filter(
          (feature) =>
            feature.source === ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID
        )
        .map(toEnergymapSelectedBuilding)
        .find((building) => building != null) ?? null,
    [selectedFeatures, buildingApplicable]
  )
  const { panels: buildingInfoPanels, missingData: buildingInfoMissingData } =
    React.useMemo(
      () =>
        createEnergymapBuildingInfoPresentation({
          selectedBuilding: selectedEnergymapBuilding,
          locale,
        }),
      [locale, selectedEnergymapBuilding]
    )
  const buildingInfoTopology = React.useMemo(
    () => deriveEnergymapBuildingInfoPanelTopology(buildingInfoPanels),
    [buildingInfoPanels]
  )
  const selectedBuildingKey = selectedEnergymapBuilding?.buildingKey ?? null
  const isBuildingInfoShellStateCurrent =
    buildingInfoShellState.buildingKey === selectedBuildingKey
  const activeBuildingInfoTab = resolveEnergymapBuildingInfoTab({
    topology: buildingInfoTopology,
    requestedTabId: isBuildingInfoShellStateCurrent
      ? buildingInfoShellState.requestedTabId
      : 'basic',
  })
  const activeBuildingInfoMode = activeBuildingInfoTab?.mode ?? 'twoPanel'
  const hasBuildingInfo = buildingInfoTopology.availableTabs.length > 0
  const isBuildingInfoCollapsed =
    hasBuildingInfo &&
    isBuildingInfoShellStateCurrent &&
    buildingInfoShellState.isCollapsed
  const buildingInfoDesktopMinWidthPx =
    getEnergymapBuildingInfoDesktopMinWidthPx(
      activeBuildingInfoTab?.desktopContentWidthPx ?? 0,
      buildingInfoTopology.hasTabRail
    )
  const buildingInfoDesktopMinWidthMatches = useBreakpointMatch(
    `(min-width:${buildingInfoDesktopMinWidthPx}px)`
  )
  const isBuildingInfoExpanded = hasBuildingInfo && !isBuildingInfoCollapsed
  const useBuildingInfoMobileLayout = isMobile
  const useBuildingInfoDesktopFullscreenFallback =
    isBuildingInfoExpanded && !isMobile && !buildingInfoDesktopMinWidthMatches
  const isSharedBuildingLayerGroupVisible = visibleLayerGroupIds.includes(
    ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID
  )
  const isHeatingLayerVisible =
    isSharedBuildingLayerGroupVisible &&
    activeThematicMode === HEATING_THEMATIC_MODE
  const isVentilationLayerVisible =
    isSharedBuildingLayerGroupVisible &&
    activeThematicMode === VENTILATION_THEMATIC_MODE
  const isEnergyCertificateLayerVisible =
    isSharedBuildingLayerGroupVisible &&
    activeThematicMode === ENERGY_CERTIFICATE_THEMATIC_MODE
  const shouldShowMobileEnergyCertificateControls =
    buildingApplicable &&
    isMobile &&
    !isSidebarOpen &&
    isEnergyCertificateLayerVisible
  const upcomingTooltip = t('sidebar.front_page.upcoming_tooltip')
  const toggleEnergyClassesAria = t(
    'sidebar.front_page.aria.toggle_energy_classes'
  )
  const toggleHeatingAria = t('sidebar.front_page.aria.toggle_heating')
  const toggleVentilationAria = t('sidebar.front_page.aria.toggle_ventilation')
  const footerLabel = t('sidebar.front_page.footer.edit_building_details')
  const buildingInfoAriaLabels = React.useMemo(
    () => ({
      close: t('sidebar.building_info.aria.close'),
      collapse: t('sidebar.building_info.aria.collapse'),
      overview: t('sidebar.building_info.aria.open_overview'),
      renovation: t('sidebar.building_info.aria.open_renovation'),
    }),
    [t]
  )
  const toggleThematicMode = React.useCallback(
    async (mode: EnergymapMainThematicMode) => {
      if (useAppletStore.getState().effectiveGeography !== 'buildings') return
      const isModeCurrentlyVisible =
        isSharedBuildingLayerGroupVisible && activeThematicMode === mode
      const nextMode = isModeCurrentlyVisible ? null : mode

      if (nextMode && !isSharedBuildingLayerGroupVisible) {
        await enableLayerGroup(
          ENERGYMAP_BUILDING_POLYGONS_LAYER_GROUP_ID,
          listedBackgroundBuildingFiltersAccordion.addOptions
        )
      }

      if (useAppletStore.getState().effectiveGeography !== 'buildings') return
      setActiveThematicMode(nextMode)
    },
    [activeThematicMode, enableLayerGroup, isSharedBuildingLayerGroupVisible]
  )
  const handleHeatingSwitchChange =
    (id: HeatingSwitchKey): React.ChangeEventHandler<HTMLInputElement> =>
    (event) => {
      if (useAppletStore.getState().effectiveGeography !== 'buildings') return
      setHeatingSwitchState((currentState) => ({
        ...currentState,
        [id]: event.target.checked,
      }))
    }
  const handleVentilationSwitchChange =
    (
      id: EnergymapVentilationCategory
    ): React.ChangeEventHandler<HTMLInputElement> =>
    (event) => {
      if (useAppletStore.getState().effectiveGeography !== 'buildings') return
      setVentilationSwitchState((currentState) => ({
        ...currentState,
        [id]: event.target.checked,
      }))
    }
  const handleBuildingInfoModeChange = React.useCallback(
    (mode: BuildingInfoDesktopMode) => {
      const nextTab = buildingInfoTopology.availableTabs.find(
        (tab) => tab.mode === mode
      )

      if (nextTab == null || selectedBuildingKey == null) {
        return
      }

      setBuildingInfoShellState({
        buildingKey: selectedBuildingKey,
        requestedTabId: nextTab.id,
        isCollapsed: false,
      })
      setIsSidebarOpen(true)
    },
    [buildingInfoTopology.availableTabs, selectedBuildingKey, setIsSidebarOpen]
  )
  const handleBuildingInfoActiveTabChange = React.useCallback(
    (tabId: BuildingInfoTabId) => {
      if (
        selectedBuildingKey == null ||
        !buildingInfoTopology.availableTabs.some((tab) => tab.id === tabId)
      ) {
        return
      }

      setBuildingInfoShellState((currentState) => ({
        buildingKey: selectedBuildingKey,
        requestedTabId: tabId,
        isCollapsed:
          currentState.buildingKey === selectedBuildingKey
            ? currentState.isCollapsed
            : false,
      }))
    },
    [buildingInfoTopology.availableTabs, selectedBuildingKey]
  )
  const handleCollapseBuildingInfo = React.useCallback(
    (tabId: BuildingInfoTabId) => {
      if (
        selectedBuildingKey == null ||
        !buildingInfoTopology.availableTabs.some((tab) => tab.id === tabId)
      ) {
        return
      }

      setBuildingInfoShellState({
        buildingKey: selectedBuildingKey,
        requestedTabId: tabId,
        isCollapsed: true,
      })
      setIsSidebarOpen(true)
    },
    [buildingInfoTopology.availableTabs, selectedBuildingKey, setIsSidebarOpen]
  )
  const handleCloseBuildingInfo = React.useCallback(() => {
    setIsSidebarOpen(true)
    setSelectedFeatures([])
  }, [setIsSidebarOpen, setSelectedFeatures])

  React.useEffect(() => {
    const resolvedTabId =
      resolveEnergymapBuildingInfoTab({
        topology: buildingInfoTopology,
        requestedTabId: isBuildingInfoShellStateCurrent
          ? buildingInfoShellState.requestedTabId
          : 'basic',
      })?.id ?? 'basic'
    const nextState: BuildingInfoShellState = {
      buildingKey: selectedBuildingKey,
      requestedTabId: resolvedTabId,
      isCollapsed: isBuildingInfoCollapsed,
    }

    if (
      buildingInfoShellState.buildingKey !== nextState.buildingKey ||
      buildingInfoShellState.requestedTabId !== nextState.requestedTabId ||
      buildingInfoShellState.isCollapsed !== nextState.isCollapsed
    ) {
      setBuildingInfoShellState(nextState)
    }

    if (selectedBuildingKey != null && !isBuildingInfoShellStateCurrent) {
      setIsSidebarOpen(true)
    }
  }, [
    buildingInfoShellState,
    buildingInfoTopology,
    isBuildingInfoCollapsed,
    isBuildingInfoShellStateCurrent,
    selectedBuildingKey,
    setIsSidebarOpen,
  ])

  React.useEffect(() => {
    if (
      areEnergymapSelectedBuildingsEqual(
        selectedBuilding,
        selectedEnergymapBuilding
      )
    ) {
      return
    }

    if (selectedEnergymapBuilding == null) {
      clearSelectedBuilding()
      return
    }

    setSelectedBuilding(selectedEnergymapBuilding)
  }, [
    clearSelectedBuilding,
    selectedBuilding,
    selectedEnergymapBuilding,
    setSelectedBuilding,
  ])

  React.useEffect(() => {
    if (!isSharedBuildingLayerGroupRegistered) {
      return
    }

    void Promise.all(
      ENERGYMAP_BUILDING_POLYGONS_LAYER_IDS.map((layerId) =>
        setFilter(layerId, buildingFilter)
      )
    )
  }, [buildingFilter, isSharedBuildingLayerGroupRegistered, setFilter])

  React.useEffect(() => {
    if (!isSharedBuildingLayerGroupRegistered) {
      return
    }

    void Promise.all(
      ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS.map((layerId) =>
        setFilter(layerId, buildingFilter)
      )
    )
  }, [buildingFilter, isSharedBuildingLayerGroupRegistered, setFilter])

  React.useEffect(() => {
    if (!isSharedBuildingLayerGroupRegistered) {
      return
    }

    void Promise.all([
      setPaintProperty(
        ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
        'fill-color',
        energyCertificateFillColorExpression
      ),
      setPaintProperty(
        ENERGYMAP_ENERGY_CERTIFICATE_OUTLINE_LAYER_ID,
        'line-color',
        energyCertificateFillColorExpression
      ),
    ])
  }, [
    energyCertificateFillColorExpression,
    isSharedBuildingLayerGroupRegistered,
    setPaintProperty,
  ])

  React.useEffect(() => {
    if (!isSharedBuildingLayerGroupRegistered) {
      return
    }

    void Promise.all(
      ENERGYMAP_HEATING_LAYER_IDS.map((layerId) =>
        setFilter(layerId, combinedHeatingFilter)
      )
    )
  }, [combinedHeatingFilter, isSharedBuildingLayerGroupRegistered, setFilter])

  React.useEffect(() => {
    if (!isSharedBuildingLayerGroupRegistered) {
      return
    }

    void Promise.all(
      ENERGYMAP_VENTILATION_LAYER_IDS.map((layerId) =>
        setFilter(layerId, combinedVentilationFilter)
      )
    )
  }, [
    combinedVentilationFilter,
    isSharedBuildingLayerGroupRegistered,
    setFilter,
  ])

  React.useEffect(() => {
    if (!isSharedBuildingLayerGroupRegistered) {
      return
    }

    const energyCertificatesVisible =
      buildingApplicable &&
      isSharedBuildingLayerGroupVisible &&
      activeThematicMode === ENERGY_CERTIFICATE_THEMATIC_MODE
    const heatingVisible =
      buildingApplicable &&
      isSharedBuildingLayerGroupVisible &&
      activeThematicMode === HEATING_THEMATIC_MODE
    const ventilationVisible =
      buildingApplicable &&
      isSharedBuildingLayerGroupVisible &&
      activeThematicMode === VENTILATION_THEMATIC_MODE

    void Promise.all([
      ...ENERGYMAP_ENERGY_CERTIFICATE_LAYER_IDS.map((layerId) =>
        setLayoutProperty(
          layerId,
          'visibility',
          energyCertificatesVisible ? 'visible' : 'none'
        )
      ),
      setPaintProperty(
        ENERGYMAP_ENERGY_CERTIFICATE_FILL_LAYER_ID,
        'fill-opacity',
        energyCertificatesVisible
          ? ENERGYMAP_ENERGY_CERTIFICATE_FILL_OPACITY
          : INACTIVE_THEMATIC_OPACITY
      ),
      setPaintProperty(
        ENERGYMAP_ENERGY_CERTIFICATE_OUTLINE_LAYER_ID,
        'line-opacity',
        energyCertificatesVisible
          ? ENERGYMAP_ENERGY_CERTIFICATE_OUTLINE_OPACITY
          : INACTIVE_THEMATIC_OPACITY
      ),
      ...ENERGYMAP_HEATING_LAYER_IDS.map((layerId) =>
        setLayoutProperty(
          layerId,
          'visibility',
          heatingVisible ? 'visible' : 'none'
        )
      ),
      setPaintProperty(
        ENERGYMAP_HEATING_FILL_LAYER_ID,
        'fill-opacity',
        heatingVisible
          ? ENERGYMAP_HEATING_FILL_OPACITY
          : INACTIVE_THEMATIC_OPACITY
      ),
      setPaintProperty(
        ENERGYMAP_HEATING_OUTLINE_LAYER_ID,
        'line-opacity',
        heatingVisible
          ? ENERGYMAP_HEATING_OUTLINE_OPACITY
          : INACTIVE_THEMATIC_OPACITY
      ),
      ...ENERGYMAP_VENTILATION_LAYER_IDS.map((layerId) =>
        setLayoutProperty(
          layerId,
          'visibility',
          ventilationVisible ? 'visible' : 'none'
        )
      ),
      setPaintProperty(
        ENERGYMAP_VENTILATION_FILL_LAYER_ID,
        'fill-opacity',
        ventilationVisible
          ? ENERGYMAP_VENTILATION_FILL_OPACITY
          : INACTIVE_THEMATIC_OPACITY
      ),
      setPaintProperty(
        ENERGYMAP_VENTILATION_OUTLINE_LAYER_ID,
        'line-opacity',
        ventilationVisible
          ? ENERGYMAP_VENTILATION_OUTLINE_OPACITY
          : INACTIVE_THEMATIC_OPACITY
      ),
    ])
  }, [
    activeThematicMode,
    buildingApplicable,
    isSharedBuildingLayerGroupRegistered,
    isSharedBuildingLayerGroupVisible,
    setLayoutProperty,
    setPaintProperty,
  ])

  React.useEffect(() => {
    if (!isSharedBuildingLayerGroupRegistered) return
    void Promise.all(
      ENERGYMAP_BUILDING_POLYGONS_LAYER_IDS.map((layerId) =>
        setLayoutProperty(
          layerId,
          'visibility',
          buildingApplicable && isSharedBuildingLayerGroupVisible
            ? 'visible'
            : 'none'
        )
      )
    )
  }, [
    buildingApplicable,
    isSharedBuildingLayerGroupRegistered,
    isSharedBuildingLayerGroupVisible,
    setLayoutProperty,
  ])

  const buildingInfoActionRail =
    hasBuildingInfo && isBuildingInfoCollapsed ? (
      <BuildingInfoActionRail
        activeMode={activeBuildingInfoMode}
        availableModes={buildingInfoTopology.availableTabs.map(
          (tab) => tab.mode
        )}
        isCollapsed={isBuildingInfoCollapsed}
        orientation={useBuildingInfoMobileLayout ? 'row' : 'column'}
        ariaLabels={buildingInfoAriaLabels}
        onModeChange={handleBuildingInfoModeChange}
      />
    ) : null
  const buildingInfoPanelRuntimeOptions = React.useMemo(
    () =>
      getEnergymapBuildingInfoPanelRuntimeOptions({
        hasBuildingInfo,
        isBuildingInfoCollapsed,
        isMobileLayout: useBuildingInfoMobileLayout,
        isDesktopFullscreenFallback: useBuildingInfoDesktopFullscreenFallback,
        desktopContentWidthPx: activeBuildingInfoTab?.desktopContentWidthPx,
      }),
    [
      activeBuildingInfoTab?.desktopContentWidthPx,
      hasBuildingInfo,
      isBuildingInfoCollapsed,
      useBuildingInfoDesktopFullscreenFallback,
      useBuildingInfoMobileLayout,
    ]
  )

  return (
    <SidebarPanelExtensionProvider
      id="energiakartta-building-info-panel"
      enabled={hasBuildingInfo || hasAreaInfo}
      runtimeOptions={
        hasAreaInfo
          ? getEnergymapBuildingInfoPanelRuntimeOptions({
              hasBuildingInfo: true,
              isBuildingInfoCollapsed: false,
              isMobileLayout: isMobile,
              desktopContentWidthPx: 400,
            })
          : buildingInfoPanelRuntimeOptions
      }
    >
      <IntoSidebarHeaderSlot>
        <SidebarHeader
          title={
            <TText
              keyName="sidebar.front_page.header.title"
              ns="energiakartta"
            />
          }
          backgroundImage="/files/img/energiakartta/sidebar/main-hero-header-crop.jpg"
        />
      </IntoSidebarHeaderSlot>
      <IntoSidebarFooterSlot>
        <SidebarFooterAction
          tooltip={upcomingTooltip}
          label={footerLabel}
          mobileActionCount={
            hasBuildingInfo &&
            isBuildingInfoCollapsed &&
            useBuildingInfoMobileLayout
              ? buildingInfoTopology.availableTabs.length
              : 0
          }
        />
      </IntoSidebarFooterSlot>
      {hasAreaInfo && (
        <IntoSidebarPanelExtensionPanelSlot panelId="main">
          <EnergyAreaDetailPanel locale={locale} />
        </IntoSidebarPanelExtensionPanelSlot>
      )}
      {isBuildingInfoExpanded && buildingInfoPanels != null && (
        <IntoSidebarPanelExtensionPanelSlot panelId="main">
          <BuildingInfoTabPages
            additionalControls={<EnergyAreaBackButton iconOnly />}
            key={`${selectedBuildingKey}:${buildingInfoTopology.signature}`}
            missingData={buildingInfoMissingData}
            locale={locale}
            topology={buildingInfoTopology}
            ariaLabels={buildingInfoAriaLabels}
            activeTabId={activeBuildingInfoTab?.id}
            forceMobileLayout={useBuildingInfoMobileLayout}
            isDesktopFullscreenLayout={
              buildingInfoPanelRuntimeOptions.layoutMode === 'fullscreen' &&
              !useBuildingInfoMobileLayout
            }
            onActiveTabChange={handleBuildingInfoActiveTabChange}
            onClose={handleCloseBuildingInfo}
            onCollapse={handleCollapseBuildingInfo}
          />
        </IntoSidebarPanelExtensionPanelSlot>
      )}
      {buildingInfoActionRail != null && (
        <IntoSidebarPanelExtensionActionRailSlot>
          {buildingInfoActionRail}
        </IntoSidebarPanelExtensionActionRailSlot>
      )}
      {!isSidebarOpen && (
        <IntoSlot name={MAP_BOTTOM_LEFT_FLOATING_CONTROLS_SLOT}>
          <Box
            sx={{
              pointerEvents: 'auto',
              backgroundColor: '#fff',
              borderRadius: 2,
              p: 1.5,
              width: {
                mobile: 'min(260px, calc(100vw - 100px))',
                desktop: 280,
              },
              maxHeight: '50dvh',
              overflowY: 'auto',
              boxShadow: '0 2px 8px #0002',
            }}
          >
            <EnergyAreaControls locale={locale} compact />
          </Box>
        </IntoSlot>
      )}
      {shouldShowMobileEnergyCertificateControls && (
        <IntoSlot name={MAP_BOTTOM_LEFT_FLOATING_CONTROLS_SLOT}>
          <EnergyCertificateClassControls
            variant="mobile"
            orientation="vertical"
          />
        </IntoSlot>
      )}
      <SidebarContentBox
        scrollbarSide="left"
        sxInner={{
          height: '100%',
        }}
      >
        <Box
          sx={{
            pt: SIDEBAR_CONTENT_VERTICAL_PADDING,
            pb: SIDEBAR_CONTENT_VERTICAL_PADDING,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box sx={{ mb: 3 }}>
            <EnergyAreaControls locale={locale} />
          </Box>
          <Box
            component="h1"
            sx={{
              m: 0,
              maxWidth: '18.1875rem',
              color: '#111111',
              fontSize: '0.75rem',
              fontWeight: 700,
              lineHeight: '1.25rem',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}
          >
            <TText keyName="sidebar.front_page.heading" ns="energiakartta" />
          </Box>

          <Box
            component="p"
            sx={{
              m: 0,
              mt: { mobile: '3rem', desktop: '3.75rem' },
              maxWidth: '18.1875rem',
              color: '#111111',
              fontSize: '0.75rem',
              fontWeight: 400,
              lineHeight: '1.125rem',
              letterSpacing: '0.05em',
            }}
          >
            <TText
              keyName="sidebar.front_page.description"
              ns="energiakartta"
            />
          </Box>

          <Box
            sx={{
              mt: { mobile: '4rem', desktop: '6.875rem' },
              display: 'flex',
              flexDirection: 'column',
              gap: '2.25rem',
              maxWidth: '19.625rem',
            }}
          >
            <LayerToggleRowAccordion
              disabled={!buildingApplicable}
              applyNegativeMargins
              label={
                <TText
                  keyName="sidebar.front_page.layers.energy_classes"
                  ns="energiakartta"
                />
              }
              status={isEnergyCertificateLayerVisible ? 'visible' : 'hidden'}
              expanded={isEnergyCertificateLayerVisible}
              ariaLabel={toggleEnergyClassesAria}
              onToggle={() => {
                void toggleThematicMode(ENERGY_CERTIFICATE_THEMATIC_MODE)
              }}
            >
              <EnergyClassesAccordionContent />
            </LayerToggleRowAccordion>
            <LayerToggleRowAccordion
              disabled={!buildingApplicable}
              applyNegativeMargins
              label={
                <TText
                  keyName="sidebar.front_page.layers.heating"
                  ns="energiakartta"
                />
              }
              status={isHeatingLayerVisible ? 'visible' : 'hidden'}
              expanded={isHeatingLayerVisible}
              ariaLabel={toggleHeatingAria}
              onToggle={() => {
                void toggleThematicMode(HEATING_THEMATIC_MODE)
              }}
            >
              <HeatingAccordionContent
                heatingSwitchState={heatingSwitchState}
                onHeatingSwitchChange={handleHeatingSwitchChange}
              />
            </LayerToggleRowAccordion>
            <LayerToggleRowAccordion
              disabled={!buildingApplicable}
              applyNegativeMargins
              label={
                <TText
                  keyName="sidebar.front_page.layers.ventilation"
                  ns="energiakartta"
                />
              }
              status={isVentilationLayerVisible ? 'visible' : 'hidden'}
              expanded={isVentilationLayerVisible}
              ariaLabel={toggleVentilationAria}
              onToggle={() => {
                void toggleThematicMode(VENTILATION_THEMATIC_MODE)
              }}
            >
              <VentilationAccordionContent
                ventilationSwitchState={ventilationSwitchState}
                onVentilationSwitchChange={handleVentilationSwitchChange}
              />
            </LayerToggleRowAccordion>
          </Box>
        </Box>
      </SidebarContentBox>
    </SidebarPanelExtensionProvider>
  )
}

export default EnergyHomePage
