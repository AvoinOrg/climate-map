import React from 'react'
import { Collapsible } from '@base-ui/react/collapsible'
import { useTranslate } from '@tolgee/react'

import { MAP_CONTROL_EDGE_GUTTER_PX } from '#/common/constants/map'
import { useLocaleFormatter } from '#/common/hooks/useLocaleFormatter'
import { useIsMobile } from '#/common/hooks/ui/useIsMobile'
import {
  Box,
  type AppSxProps,
  type AppTheme,
  toSxArray,
} from '#/common/style/theme'
import { Button, ButtonBase, IconButton } from '#/components/common/Button'
import AppTooltip from '#/components/common/AppTooltip'
import CustomAccordion from '#/components/common/CustomAccordion'
import CustomAccordionSummary from '#/components/common/CustomAccordionSummary'
import { NumberInputField } from '#/components/common/NumberInputField'
import SquishedSwitchWithLabel from '#/components/common/SquishedSwitchWithLabel'
import TText from '#/components/common/TText'
import InfoCircle from '#/components/icons/InfoCircle'
import QuestionCircleOutline from '#/components/icons/QuestionCircleOutline'
import { SidebarPanelExtensionPageContainer } from '#/components/Sidebar/SidebarPanelExtensionPageContainer'
import { SidebarPanelExtensionTabContainer } from '#/components/Sidebar/SidebarPanelExtensionTabContainer'
import {
  SidebarPanelExtensionTooltip as BuildingInfoTooltip,
  type SidebarPanelExtensionTooltipSide as BuildingInfoTooltipSide,
  type SidebarPanelExtensionTooltipTriggerProps as BuildingInfoTooltipTriggerProps,
} from '#/components/Sidebar/SidebarPanelExtensionTooltip'
import { useNullableSidebarPanelExtensionTabsContext } from '#/components/Sidebar/SidebarPanelExtensionTabsContext'
import type {
  EnergymapBuildingInfoMissingData,
  EnergymapBuildingInfoConsumptionControls,
  EnergymapBuildingInfoEnergySubmetric,
  EnergymapBuildingInfoEnergySubmetricId,
  EnergymapEnergyMeasure,
  EnergymapBuildingInfoMetric,
  EnergymapBuildingInfoMetricValue,
  EnergymapBuildingInfoNote,
  EnergymapBuildingInfoPanel,
  EnergymapBuildingInfoPanelId,
  EnergymapBuildingInfoRow,
  EnergymapBuildingInfoScenario,
  EnergymapBuildingInfoSection,
  EnergymapBuildingInfoText,
  EnergymapBuildingInfoValue,
  EnergymapBuildingInfoValueStatus,
  EnergymapBuildingInfoPrimaryMetric,
  EnergymapBuildingInfoPrimaryMetricId,
} from '../common/buildingInfo'
import {
  getSelectedEnergyConsumption,
  normalizeEnergySubmetricSelection,
} from '../common/buildingInfo'
import {
  getEnergymapEffectiveWaterProjection,
  type EnergymapEffectiveWaterProjection,
} from '../common/buildingInfoProvenance'
import {
  getBuildingInfoModeForTabId,
  getBuildingInfoPanelIds,
  getBuildingInfoTabIdForMode,
  getBuildingInfoTabPanelIds,
  isBuildingInfoTabId,
  resolveEnergymapBuildingInfoTab,
} from '../common/buildingInfoPanelTopology'
import type {
  BuildingInfoDesktopMode,
  BuildingInfoTabId,
  EnergymapBuildingInfoDesktopPanelRow,
  EnergymapBuildingInfoPanelTopology,
  EnergymapBuildingInfoTabTopology,
} from '../common/buildingInfoPanelTopology'
import { BuildingInfoProvenanceView } from './BuildingInfoProvenanceView'

export type { BuildingInfoDesktopMode, BuildingInfoTabId }
export {
  getBuildingInfoModeForTabId,
  getBuildingInfoPanelIds,
  getBuildingInfoTabIdForMode,
  getBuildingInfoTabPanelIds,
}

type BuildingInfoActionLabels = {
  close: string
  collapse: string
  overview: string
  renovation: string
}

type BuildingInfoTabPagesProps = {
  missingData: EnergymapBuildingInfoMissingData | null
  locale: string
  topology: EnergymapBuildingInfoPanelTopology
  ariaLabels: BuildingInfoActionLabels
  activeTabId?: BuildingInfoTabId
  forceMobileLayout?: boolean
  isDesktopFullscreenLayout?: boolean
  onActiveTabChange?: (tabId: BuildingInfoTabId) => void
  onClose: () => void
  onCollapse: (tabId: BuildingInfoTabId) => void
}

type BuildingInfoEffectiveWaterProjectionChange = (
  projection?: EnergymapEffectiveWaterProjection
) => void

type BuildingInfoProvenanceDisclosureState =
  | 'closed'
  | 'pointerPending'
  | 'open'

type BuildingInfoEffectiveWaterProjectionContextValue = {
  onProjectionChange: BuildingInfoEffectiveWaterProjectionChange
  provenanceDisclosureState: BuildingInfoProvenanceDisclosureState
  getProvenanceDisclosureState: () => BuildingInfoProvenanceDisclosureState
}

const BuildingInfoEffectiveWaterProjectionContext = React.createContext<
  BuildingInfoEffectiveWaterProjectionContextValue | undefined
>(undefined)

type BuildingInfoActionRailProps = {
  activeMode: BuildingInfoDesktopMode
  availableModes: readonly BuildingInfoDesktopMode[]
  isCollapsed: boolean
  orientation?: 'row' | 'column'
  ariaLabels: Pick<BuildingInfoActionLabels, 'overview' | 'renovation'>
  onModeChange: (mode: BuildingInfoDesktopMode) => void
}

type BuildingInfoInlineTooltipTriggerProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  'color'
> & {
  ref?: React.Ref<HTMLElement>
}

type BuildingInfoTooltipClickEvent = React.MouseEvent<HTMLButtonElement> & {
  preventBaseUIHandler?: () => void
}

const STATUS_SX = {
  real: {
    color: '#111111',
  },
  estimate: {
    color: '#075cff',
  },
  missing: {
    color: '#767676',
    fontStyle: 'italic',
  },
  placeholder: {
    color: '#5f5f5f',
    fontStyle: 'italic',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
    textDecorationColor: '#a347ff',
    textUnderlineOffset: '0.18em',
  },
} as const satisfies Record<EnergymapBuildingInfoValueStatus, object>

const PANEL_ACCENTS: Record<EnergymapBuildingInfoPanelId, string> = {
  energyConsumption: '#075cff',
  renovationRecommendations: '#a347ff',
  buildingDetails: '#075cff',
}

const PANEL_BACKGROUNDS: Record<EnergymapBuildingInfoPanelId, string> = {
  energyConsumption: '#fefdfd',
  renovationRecommendations: '#fafafa',
  buildingDetails: '#f4f4f4',
}

const RENOVATION_EFFECTIVENESS_BACKGROUND = '#f0f0f0'

const PANEL_CONTENT_WIDTHS: Record<EnergymapBuildingInfoPanelId, string> = {
  energyConsumption: '17.625rem',
  renovationRecommendations: '26.875rem',
  buildingDetails: '17.625rem',
}

const DESKTOP_HEADING_TOP = '7.375rem'
const DESKTOP_SECTION_BOTTOM_PADDING = '6.5rem'
const DESKTOP_HEADING_GRAPHIC_TOP = '-4.25rem'
const DESKTOP_HEADING_DIVIDER_MARGIN_TOP = '0.75rem'
const SIDEBAR_ASSET_BASE = '/files/img/energiakartta/sidebar'

const BUILDING_INFO_ASSETS = {
  unavailableValue: `${SIDEBAR_ASSET_BASE}/building-info-unavailable-value.svg`,
  energyLightning: `${SIDEBAR_ASSET_BASE}/building-info-energy-lightning.svg`,
  renovationIconCenter: `${SIDEBAR_ASSET_BASE}/building-info-renovation-icon-center.svg`,
  renovationIconArcLower: `${SIDEBAR_ASSET_BASE}/building-info-renovation-icon-arc-lower.svg`,
  renovationIconArcUpper: `${SIDEBAR_ASSET_BASE}/building-info-renovation-icon-arc-upper.svg`,
  renovationBuilding: `${SIDEBAR_ASSET_BASE}/building-info-renovation-building.svg`,
  renovationBuildingSmallA: `${SIDEBAR_ASSET_BASE}/building-info-renovation-building-small-a.svg`,
  renovationBuildingSmallB: `${SIDEBAR_ASSET_BASE}/building-info-renovation-building-small-b.svg`,
  warningBase: `${SIDEBAR_ASSET_BASE}/building-info-warning-base.svg`,
  warningLine: `${SIDEBAR_ASSET_BASE}/building-info-warning-line.svg`,
  warningDot: `${SIDEBAR_ASSET_BASE}/building-info-warning-dot.svg`,
} as const

const BUILDING_INFO_GRAPHIC_DIMENSIONS = {
  renovationBuilding: {
    width: 238.82421875,
    height: 300.0000305175781,
  },
  renovationBuildingSmallA: {
    width: 109.861328125,
    height: 138.0028076171875,
  },
  renovationBuildingSmallB: {
    width: 114.9908218383789,
    height: 138.00025939941406,
  },
} as const

type BuildingInfoGraphicDimensions =
  (typeof BUILDING_INFO_GRAPHIC_DIMENSIONS)[keyof typeof BUILDING_INFO_GRAPHIC_DIMENSIONS]

const RENOVATION_SCENARIO_GRAPHICS: Partial<
  Record<
    EnergymapEnergyMeasure,
    {
      src: string
      dimensions: BuildingInfoGraphicDimensions
      testId: string
    }
  >
> = {
  aahp: {
    src: BUILDING_INFO_ASSETS.renovationBuildingSmallA,
    dimensions: BUILDING_INFO_GRAPHIC_DIMENSIONS.renovationBuildingSmallA,
    testId: 'building-info-graphic-renovation-building-small-a',
  },
  solar: {
    src: BUILDING_INFO_ASSETS.renovationBuildingSmallB,
    dimensions: BUILDING_INFO_GRAPHIC_DIMENSIONS.renovationBuildingSmallB,
    testId: 'building-info-graphic-renovation-building-small-b',
  },
  windows: {
    src: BUILDING_INFO_ASSETS.renovationBuildingSmallA,
    dimensions: BUILDING_INFO_GRAPHIC_DIMENSIONS.renovationBuildingSmallA,
    testId: 'building-info-graphic-renovation-building-small-a',
  },
}

const BUILDING_INFO_ACTION_BUTTON_SIZE_PX = 45
const BUILDING_INFO_ACTION_BUTTON_GAP_PX = 10

const textSx = {
  fontSize: '0.625rem',
  fontWeight: 400,
  lineHeight: '1.125rem',
  letterSpacing: '0.1em',
} as const

const energyControlTextSx = {
  fontSize: '0.5625rem',
  fontWeight: 700,
  lineHeight: '0.875rem',
  letterSpacing: 0,
} as const

const ENERGY_PRIMARY_METRIC_ORDER: readonly EnergymapBuildingInfoPrimaryMetricId[] =
  ['energy', 'water', 'cost', 'co2']

const ENERGY_SUBMETRIC_ORDER: readonly EnergymapBuildingInfoEnergySubmetricId[] =
  ['electricity', 'heating', 'waterHeating']

const ENERGY_ANNUAL_TOTAL_LABEL: EnergymapBuildingInfoText = {
  type: 'translation',
  keyName: 'sidebar.building_info.panels.energy.metric.annual_total',
}

const actionButtonSx = ({ active }: { active: boolean }) => ({
  width: `${BUILDING_INFO_ACTION_BUTTON_SIZE_PX}px`,
  height: `${BUILDING_INFO_ACTION_BUTTON_SIZE_PX}px`,
  minWidth: `${BUILDING_INFO_ACTION_BUTTON_SIZE_PX}px`,
  borderRadius: '10px',
  backgroundColor: active ? '#e8d0ff' : '#f4f4f4',
  color: '#111111',
  boxShadow: active
    ? '0px 1px 2px rgba(0, 0, 0, 0.2)'
    : '0px 1px 2px rgba(0, 0, 0, 0.12)',
  '&:hover': {
    backgroundColor: active ? '#dec0fb' : '#ffffff',
  },
})

const getSourcePropertiesData = (sourceProperties?: string[]) =>
  sourceProperties == null || sourceProperties.length === 0
    ? undefined
    : sourceProperties.join(',')

const isUnavailableValueStatus = (status: EnergymapBuildingInfoValueStatus) =>
  status === 'missing' || status === 'placeholder'

const VISUALLY_HIDDEN_STYLE: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

const BuildingInfoInlineTooltip = ({
  title,
  side = 'top',
  children,
}: {
  title: React.ReactNode
  side?: BuildingInfoTooltipSide
  children: (props: BuildingInfoInlineTooltipTriggerProps) => React.ReactElement
}) => (
  <AppTooltip
    title={title}
    side={side}
    delay={0}
    closeDelay={0}
    popupSx={{ px: 1 }}
  >
    {(triggerProps) =>
      children(triggerProps as BuildingInfoInlineTooltipTriggerProps)
    }
  </AppTooltip>
)

const isPlainEnergyClassText = (text: EnergymapBuildingInfoText) =>
  text.type === 'plain' && /^[A-G]$/i.test(text.text.trim())

const BuildingInfoDecorativeImage = ({
  src,
  width,
  height,
  sx,
}: {
  src: string
  width: string
  height: string
  sx?: AppSxProps
}) => (
  <Box
    component="span"
    aria-hidden="true"
    sx={[
      {
        display: 'block',
        width,
        height,
        flexShrink: 0,
      },
      ...toSxArray(sx),
    ]}
  >
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  </Box>
)

const getFigmaDimensionData = (dimension: number) =>
  Number(dimension.toFixed(3)).toString()

const getFigmaDimensionCss = (dimension: number) =>
  `${getFigmaDimensionData(dimension)}px`

const BuildingInfoFigmaGraphic = ({
  src,
  dimensions,
  maxWidth = '100%',
  testId,
  sx,
}: {
  src: string
  dimensions: BuildingInfoGraphicDimensions
  maxWidth?: string
  testId: string
  sx?: AppSxProps
}) => (
  <Box
    aria-hidden="true"
    data-testid={testId}
    data-figma-width={getFigmaDimensionData(dimensions.width)}
    data-figma-height={getFigmaDimensionData(dimensions.height)}
    sx={[
      {
        position: 'relative',
        display: 'block',
        width: `min(${getFigmaDimensionCss(dimensions.width)}, ${maxWidth})`,
        aspectRatio: `${dimensions.width} / ${dimensions.height}`,
        flexShrink: 0,
      },
      ...toSxArray(sx),
    ]}
  >
    <img
      src={src}
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        display: 'block',
        width: '100%',
        height: '100%',
      }}
    />
  </Box>
)

const RenovationIcon = ({
  width = '32px',
  height = '26px',
  sx,
}: {
  width?: string
  height?: string
  sx?: AppSxProps
}) => (
  <Box
    aria-hidden="true"
    sx={[
      {
        position: 'relative',
        width,
        height,
        flexShrink: 0,
      },
      ...toSxArray(sx),
    ]}
  >
    <BuildingInfoDecorativeImage
      src={BUILDING_INFO_ASSETS.renovationIconCenter}
      width="33.55%"
      height="61.23%"
      sx={{
        position: 'absolute',
        top: '19.4%',
        left: '34.84%',
      }}
    />
    <BuildingInfoDecorativeImage
      src={BUILDING_INFO_ASSETS.renovationIconArcLower}
      width="90.32%"
      height="44%"
      sx={{
        position: 'absolute',
        left: 0,
        bottom: 0,
      }}
    />
    <BuildingInfoDecorativeImage
      src={BUILDING_INFO_ASSETS.renovationIconArcUpper}
      width="90.32%"
      height="44%"
      sx={{
        position: 'absolute',
        top: 0,
        right: 0,
        transform: 'rotate(180deg)',
      }}
    />
  </Box>
)

const WarningIcon = () => (
  <Box
    aria-hidden="true"
    sx={{
      position: 'relative',
      width: '14.04px',
      height: '12.96px',
      flex: '0 0 auto',
      mt: '0.125rem',
    }}
  >
    <BuildingInfoDecorativeImage
      src={BUILDING_INFO_ASSETS.warningBase}
      width="100%"
      height="100%"
      sx={{ position: 'absolute', inset: 0 }}
    />
    <BuildingInfoDecorativeImage
      src={BUILDING_INFO_ASSETS.warningLine}
      width="1px"
      height="6px"
      sx={{
        position: 'absolute',
        top: '30.54%',
        left: '50%',
        transform: 'translateX(-50%)',
      }}
    />
    <BuildingInfoDecorativeImage
      src={BUILDING_INFO_ASSETS.warningDot}
      width="1px"
      height="1px"
      sx={{
        position: 'absolute',
        left: '50%',
        bottom: '11.57%',
        transform: 'translateX(-50%)',
      }}
    />
  </Box>
)

const BuildingInfoSvgIcon = ({
  children,
  sx,
  testId,
  viewBox = '0 0 24 24',
}: {
  children: React.ReactNode
  sx?: AppSxProps
  testId?: string
  viewBox?: string
}) => (
  <Box
    component="span"
    aria-hidden="true"
    data-testid={testId}
    sx={[
      {
        display: 'block',
        width: '1em',
        height: '1em',
        flexShrink: 0,
        color: 'currentColor',
        overflow: 'visible',
      },
      ...toSxArray(sx),
    ]}
  >
    <svg
      viewBox={viewBox}
      focusable="false"
      aria-hidden="true"
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        fill: 'currentColor',
        overflow: 'visible',
      }}
    >
      {children}
    </svg>
  </Box>
)

const EnergyBoltIcon = ({ sx }: { sx?: AppSxProps }) => (
  <BuildingInfoSvgIcon sx={sx} testId="building-info-icon-energy">
    <path d="M13.25 2 4.75 13.25h5.45L8.95 22l10.3-13.15h-5.8L13.25 2Z" />
  </BuildingInfoSvgIcon>
)

const WaterMetricIcon = ({ sx }: { sx?: AppSxProps }) => (
  <BuildingInfoSvgIcon sx={sx} testId="building-info-icon-water">
    <path d="M12 2.75c3.65 4.3 6 7.55 6 10.55A6 6 0 0 1 6 13.3c0-3 2.35-6.25 6-10.55Zm-3.25 10.6a3.25 3.25 0 0 0 4.4 3.05c.45-.18.52-.8.12-1.06-1.54-.96-2.5-2.2-2.88-3.73-.12-.5-.78-.62-1.08-.2-.36.52-.56 1.18-.56 1.94Z" />
  </BuildingInfoSvgIcon>
)

const EuroMetricIcon = ({ sx }: { sx?: AppSxProps }) => (
  <BuildingInfoSvgIcon sx={sx} testId="building-info-icon-cost">
    <path d="M15.7 5.45c-2.75-1.35-5.9.05-6.95 2.85h5.65l-.55 1.65H8.35a8.2 8.2 0 0 0 0 1.6h4.95l-.55 1.65h-4c1.02 2.82 4.2 4.22 6.95 2.87l.62 1.78c-4.04 1.78-8.58-.55-9.62-4.65H4.55l.55-1.65h1.32a8.2 8.2 0 0 1 0-1.6H4.55L5.1 8.3h1.6c1.04-4.1 5.58-6.43 9.62-4.65l-.62 1.8Z" />
  </BuildingInfoSvgIcon>
)

const Co2MetricIcon = ({ sx }: { sx?: AppSxProps }) => (
  <BuildingInfoSvgIcon sx={sx} testId="building-info-icon-co2">
    <text
      x="2.5"
      y="15.4"
      fill="currentColor"
      fontFamily="Arial, sans-serif"
      fontSize="9.3"
      fontWeight="700"
      textLength="13.4"
      lengthAdjust="spacingAndGlyphs"
    >
      CO
    </text>
    <text
      x="16.3"
      y="18.2"
      fill="currentColor"
      fontFamily="Arial, sans-serif"
      fontSize="6.2"
      fontWeight="700"
    >
      2
    </text>
  </BuildingInfoSvgIcon>
)

const HeatingMetricIcon = ({ sx }: { sx?: AppSxProps }) => (
  <BuildingInfoSvgIcon sx={sx} testId="building-info-icon-heating">
    <path d="M12.25 2.5c.2 2.72-.7 4.58-2.1 6.18-.9 1.02-1.5 1.9-1.5 3.17 0 1.05.5 1.92 1.28 2.45-.14-1.55.62-2.8 1.62-3.82.72-.72 1.2-1.5 1.28-2.7 2.1 1.48 3.42 3.48 3.42 5.96A5.2 5.2 0 0 1 11.02 19C7.75 19 5.5 16.7 5.5 13.88c0-2.45 1.32-4.02 2.68-5.6 1.25-1.45 2.48-3.02 2.38-5.47l1.69-.31Z" />
  </BuildingInfoSvgIcon>
)

const WaterHeatingMetricIcon = ({ sx }: { sx?: AppSxProps }) => (
  <BuildingInfoSvgIcon sx={sx} testId="building-info-icon-water-heating">
    <path d="M12 3.2c3 3.52 4.82 6.2 4.82 8.62a4.82 4.82 0 1 1-9.64 0C7.18 9.4 9 6.72 12 3.2Z" />
    <path
      d="M9.2 17.95c2.32-.55 3.55-1.62 3.55-3.15 0-.77-.35-1.35-.82-1.92-.46-.55-.98-1.12-.98-1.88 1.8.78 3.08 2.2 3.08 3.88 0 1.98-1.83 3.1-4.83 3.07Z"
      fill="#ffffff"
      opacity="0.75"
    />
  </BuildingInfoSvgIcon>
)

const UnavailableValueIcon = ({ sx }: { sx?: AppSxProps }) => (
  <Box
    component="span"
    data-testid="building-info-unavailable-value-icon"
    data-figma-width="12"
    data-figma-height="12"
    sx={[
      {
        position: 'relative',
        display: 'block',
        width: '12px',
        height: '12px',
        flexShrink: 0,
      },
      ...toSxArray(sx),
    ]}
  >
    <img
      src={BUILDING_INFO_ASSETS.unavailableValue}
      alt=""
      aria-hidden="true"
      width={13}
      height={13}
      style={{
        position: 'absolute',
        inset: '-0.5px',
        display: 'block',
        width: '13px',
        height: '13px',
        maxWidth: 'none',
      }}
    />
  </Box>
)

const EnergyPrimaryMetricIcon = ({
  metricId,
  active,
}: {
  metricId: EnergymapBuildingInfoPrimaryMetricId
  active: boolean
}) => {
  const iconSx = {
    fontSize:
      metricId === 'co2' ? (active ? '1.4rem' : '1.25rem') : '0.8125rem',
    color: active ? '#ffffff' : '#111111',
  } as const

  if (metricId === 'water') {
    return <WaterMetricIcon sx={iconSx} />
  }

  if (metricId === 'cost') {
    return <EuroMetricIcon sx={iconSx} />
  }

  if (metricId === 'co2') {
    return <Co2MetricIcon sx={iconSx} />
  }

  return <EnergyBoltIcon sx={iconSx} />
}

const EnergySubmetricIcon = ({
  submetricId,
  selected,
}: {
  submetricId: EnergymapBuildingInfoEnergySubmetricId
  selected: boolean
}) => {
  const iconSx = {
    fontSize: submetricId === 'heating' ? '0.875rem' : '0.75rem',
    color: selected ? '#ffffff' : '#075cff',
  } as const

  if (submetricId === 'heating') {
    return <HeatingMetricIcon sx={iconSx} />
  }

  if (submetricId === 'waterHeating') {
    return <WaterHeatingMetricIcon sx={iconSx} />
  }

  return <EnergyBoltIcon sx={iconSx} />
}

const getNormalizedPrimaryMetricId = (
  controls: EnergymapBuildingInfoConsumptionControls,
  current: EnergymapBuildingInfoPrimaryMetricId
) => {
  const validPrimaryMetricIds = new Set(
    controls.primaryMetrics.map((metric) => metric.id)
  )

  return validPrimaryMetricIds.has(current)
    ? current
    : controls.defaultPrimaryMetricId
}

const getConsumptionControlsStateKey = (
  controls: EnergymapBuildingInfoConsumptionControls
) =>
  [
    controls.defaultPrimaryMetricId,
    controls.primaryMetrics.map((metric) => metric.id).join(','),
    (controls.defaultEnergySubmetricIds ?? []).join(','),
    (controls.energySubmetrics ?? [])
      .map((submetric) => submetric.id)
      .join(','),
  ].join('|')

export const BuildingInfoText = ({
  text,
}: {
  text: EnergymapBuildingInfoText
}) => {
  if (text.type === 'plain') {
    return <>{text.text}</>
  }

  if (text.type === 'translation') {
    return (
      <TText keyName={text.keyName} ns="energiakartta" params={text.params} />
    )
  }

  return (
    <>
      {text.parts.map((part, index) => (
        <React.Fragment key={index}>
          {index > 0 ? text.separator : null}
          <BuildingInfoText text={part} />
        </React.Fragment>
      ))}
    </>
  )
}

const BuildingInfoValueText = ({
  value,
  align = 'right',
  variant = 'default',
}: {
  value: EnergymapBuildingInfoValue
  align?: 'left' | 'right'
  variant?: 'default' | 'energyClassBadge'
}) => {
  const isUnavailable = isUnavailableValueStatus(value.status)
  const shouldRenderEnergyClassBadge =
    variant === 'energyClassBadge' &&
    value.status === 'real' &&
    isPlainEnergyClassText(value.text)

  return (
    <Box
      component="span"
      data-status={value.status}
      data-source-properties={getSourcePropertiesData(value.sourceProperties)}
      lang={value.sourceLanguage}
      sx={{
        display: 'inline-flex',
        flexWrap: 'wrap',
        alignItems: shouldRenderEnergyClassBadge ? 'center' : 'baseline',
        justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
        gap: '0.25rem',
        minWidth: 0,
        maxWidth: '100%',
        fontWeight: 700,
        textAlign: align,
        wordBreak: 'break-word',
        ...STATUS_SX[value.status],
        ...(isUnavailable && {
          alignItems: 'center',
          color: '#5f5f5f',
          fontStyle: 'normal',
          textDecoration: 'none',
        }),
      }}
    >
      {isUnavailable ? (
        <BuildingInfoInlineTooltip
          side="top"
          title={
            <Box component="span">
              <BuildingInfoText text={value.text} />
            </Box>
          }
        >
          {(triggerProps) => (
            <Box
              {...triggerProps}
              component="span"
              tabIndex={0}
              sx={{
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '1.25rem',
                height: '1.25rem',
                borderRadius: '50%',
                color: '#5f5f5f',
                cursor: 'help',
                outline: 'none',
                '&:focus-visible': {
                  outline: '2px solid #111111',
                  outlineOffset: '2px',
                },
              }}
            >
              <UnavailableValueIcon />
              <Box
                component="span"
                data-testid="building-info-unavailable-value-reason"
                style={VISUALLY_HIDDEN_STYLE}
              >
                <BuildingInfoText text={value.text} />
              </Box>
            </Box>
          )}
        </BuildingInfoInlineTooltip>
      ) : shouldRenderEnergyClassBadge ? (
        <Box
          component="span"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.625rem',
            height: '1.625rem',
            borderRadius: '50%',
            border: '1.2px solid #8bd600',
            backgroundColor: '#f4ffe6',
            color: '#111111',
            fontSize: '0.75rem',
            lineHeight: 1,
            letterSpacing: '0.1em',
          }}
        >
          <BuildingInfoText text={value.text} />
        </Box>
      ) : (
        <BuildingInfoText text={value.text} />
      )}
      {value.unitKey != null && (
        <Box
          component="span"
          sx={{
            fontSize: '0.625rem',
            fontWeight: 400,
            lineHeight: '1.125rem',
          }}
        >
          <TText keyName={value.unitKey} ns="energiakartta" />
        </Box>
      )}
    </Box>
  )
}

const BuildingInfoNoteText = ({
  note,
}: {
  note: Pick<
    EnergymapBuildingInfoNote,
    'text' | 'status' | 'sourceProperties' | 'provenance'
  > &
    Partial<Pick<EnergymapBuildingInfoNote, 'id'>>
}) => {
  const showWarningIcon = note.status === 'placeholder'

  return (
    <Box
      data-note-id={note.id}
      data-status={note.status}
      data-provenance-id={note.provenance?.id}
      data-provenance-input-ids={note.provenance?.inputIds?.join(' ')}
      data-source-properties={getSourcePropertiesData(note.sourceProperties)}
      sx={{
        mt: '0.5rem',
        display: showWarningIcon ? 'flex' : 'block',
        alignItems: 'flex-start',
        gap: '0.5625rem',
        maxWidth: '100%',
        ...STATUS_SX[note.status],
      }}
    >
      {showWarningIcon && <WarningIcon />}
      <Box
        sx={{
          ...textSx,
          maxWidth: '100%',
          ...STATUS_SX[note.status],
          ...(showWarningIcon && {
            color: '#111111',
            fontStyle: 'normal',
            textDecoration: 'none',
          }),
        }}
      >
        <BuildingInfoText text={note.text} />
      </Box>
    </Box>
  )
}

const BuildingInfoRow = ({ row }: { row: EnergymapBuildingInfoRow }) => (
  <Box
    data-row-id={row.id}
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      columnGap: '1rem',
      borderTop: '0.3px solid #cfcfcf',
      py: '0.875rem',
    }}
  >
    <Box
      sx={{
        ...textSx,
        color: '#111111',
      }}
    >
      <BuildingInfoText text={row.label} />
    </Box>
    <Box
      component="div"
      sx={{
        ...textSx,
        minWidth: 0,
        textAlign: 'right',
      }}
    >
      <BuildingInfoValueText
        value={row}
        variant={row.id === 'energyClass' ? 'energyClassBadge' : 'default'}
      />
      {row.note != null && (
        <BuildingInfoNoteText
          note={{
            text: row.note,
            status: row.status,
            sourceProperties: row.sourceProperties,
          }}
        />
      )}
    </Box>
  </Box>
)

const BuildingInfoExpandableSourceTextRow = ({
  row,
}: {
  row: EnergymapBuildingInfoRow
}) => {
  const panelId = React.useId()

  return (
    <Box
      data-row-id={row.id}
      data-row-presentation={row.presentation}
      data-testid="building-info-expandable-source-text-row"
    >
      <CustomAccordion
        sx={{
          backgroundColor: 'transparent',
          '&[data-open]': {
            m: 0,
            backgroundColor: 'transparent',
          },
        }}
      >
        <CustomAccordionSummary
          aria-controls={panelId}
          data-testid={`building-info-expandable-source-text-trigger-${row.id}`}
          sx={{
            ...textSx,
            py: '0.875rem',
            borderTop: '0.3px solid #cfcfcf',
            color: '#111111',
            textAlign: 'left',
            '& .CustomAccordionSummary-expandIcon': {
              width: '1rem',
              height: '1rem',
              ml: '0.75rem',
              color: '#111111',
              '& svg': {
                width: '0.75rem',
                height: '0.75rem',
              },
            },
          }}
        >
          <BuildingInfoText text={row.label} />
        </CustomAccordionSummary>
        <Collapsible.Panel
          keepMounted
          render={(panelProps) => (
            <Box
              {...panelProps}
              id={panelId}
              data-testid={`building-info-expandable-source-text-panel-${row.id}`}
              sx={{
                height: 'var(--collapsible-panel-height)',
                overflow: 'hidden',
                transition: 'height 160ms ease',
                '&[data-starting-style], &[data-ending-style]': {
                  height: 0,
                },
              }}
            />
          )}
        >
          <Box
            data-testid={`building-info-expandable-source-text-content-${row.id}`}
            data-status={row.status}
            data-source-properties={getSourcePropertiesData(
              row.sourceProperties
            )}
            lang={row.sourceLanguage}
            sx={{
              ...textSx,
              minWidth: 0,
              maxWidth: '100%',
              pb: '0.875rem',
              fontWeight: 400,
              whiteSpace: 'pre-line',
              overflowWrap: 'anywhere',
              wordBreak: 'break-word',
              ...STATUS_SX[row.status],
            }}
          >
            <BuildingInfoText text={row.text} />
          </Box>
        </Collapsible.Panel>
      </CustomAccordion>
    </Box>
  )
}

const BuildingInfoSectionDivider = () => (
  <Box
    sx={{
      borderTop: '0.3px solid #cfcfcf',
    }}
  />
)

const BuildingInfoCalculationContextAccordion = ({
  section,
  accentColor,
}: {
  section: EnergymapBuildingInfoSection
  accentColor: string
}) => {
  const rows = section.rows ?? []
  const panelId = React.useId()

  if (section.title == null || rows.length === 0) {
    return null
  }

  return (
    <Box
      data-section-id={section.id}
      data-testid="building-info-calculation-context"
      sx={{ mt: '2.25rem' }}
    >
      <CustomAccordion
        sx={{
          backgroundColor: 'transparent',
          '&[data-open]': {
            m: 0,
            backgroundColor: 'transparent',
          },
        }}
      >
        <CustomAccordionSummary
          aria-controls={panelId}
          data-testid="building-info-calculation-context-trigger"
          sx={{
            ...textSx,
            py: '0.75rem',
            borderTop: '0.3px solid #cfcfcf',
            color: accentColor,
            textTransform: 'uppercase',
            textAlign: 'left',
            '& .CustomAccordionSummary-expandIcon': {
              width: '1rem',
              height: '1rem',
              ml: '0.75rem',
              color: accentColor,
              '& svg': {
                width: '0.75rem',
                height: '0.75rem',
              },
            },
          }}
        >
          <BuildingInfoText text={section.title} />
        </CustomAccordionSummary>
        <Collapsible.Panel
          keepMounted
          render={(panelProps) => (
            <Box
              {...panelProps}
              id={panelId}
              data-testid="building-info-calculation-context-panel"
              sx={{
                height: 'var(--collapsible-panel-height)',
                overflow: 'hidden',
                transition: 'height 160ms ease',
                '&[data-starting-style], &[data-ending-style]': {
                  height: 0,
                },
              }}
            />
          )}
        >
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              pt: '0.5rem',
              pb: '0.875rem',
              borderTop: '0.3px solid #cfcfcf',
            }}
          >
            {rows.map((row) => (
              <Box
                key={row.id}
                data-calculation-context-row-id={row.id}
                sx={{ minWidth: 0 }}
              >
                <Box
                  sx={{
                    ...textSx,
                    color: '#111111',
                    fontWeight: 700,
                  }}
                >
                  <BuildingInfoText text={row.label} />
                </Box>
                <Box
                  data-status={row.status}
                  data-source-properties={getSourcePropertiesData(
                    row.sourceProperties
                  )}
                  sx={{
                    ...textSx,
                    mt: '0.25rem',
                    minWidth: 0,
                    whiteSpace: 'normal',
                    overflowWrap: 'anywhere',
                    ...STATUS_SX[row.status],
                  }}
                >
                  <BuildingInfoText text={row.text} />
                  {row.unitKey != null && (
                    <>
                      {' '}
                      <TText keyName={row.unitKey} ns="energiakartta" />
                    </>
                  )}
                </Box>
                {row.note != null && (
                  <BuildingInfoNoteText
                    note={{
                      text: row.note,
                      status: row.status,
                      sourceProperties: row.sourceProperties,
                    }}
                  />
                )}
              </Box>
            ))}
          </Box>
        </Collapsible.Panel>
      </CustomAccordion>
    </Box>
  )
}

const BuildingInfoStackedValue = ({
  row,
}: {
  row: EnergymapBuildingInfoRow
}) => (
  <Box
    data-building-subheader-row-id={row.id}
    sx={{
      mt: '1rem',
    }}
  >
    <Box
      sx={{
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: '1.125rem',
        letterSpacing: '0.1em',
        color: '#111111',
      }}
    >
      <BuildingInfoText text={row.label} />:
    </Box>
    <Box
      component="div"
      sx={{
        fontSize: '0.75rem',
        lineHeight: '1.125rem',
        letterSpacing: '0.1em',
        color: '#111111',
      }}
    >
      <BuildingInfoValueText value={row} align="left" />
    </Box>
  </Box>
)

const BuildingInfoSectionLine = ({
  row,
  valueVariant = 'default',
}: {
  row: EnergymapBuildingInfoRow
  valueVariant?: 'default' | 'energyClassBadge'
}) => (
  <Box
    data-section-row-id={row.id}
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto)',
      columnGap: '1rem',
      alignItems: 'start',
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        ...textSx,
        minWidth: 0,
        color: '#111111',
      }}
    >
      <BuildingInfoText text={row.label} />
      {row.modeledIndicator != null && (
        <>
          {' '}
          <BuildingInfoModeledEnergyClassIndicator
            indicator={row.modeledIndicator}
          />
        </>
      )}
    </Box>
    <Box
      component="div"
      sx={{
        ...textSx,
        minWidth: 0,
        textAlign: 'right',
      }}
    >
      {valueVariant === 'energyClassBadge' ? (
        <Box
          component="span"
          data-testid="building-info-energy-class-value-stack"
          sx={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            maxWidth: '100%',
            textAlign: 'left',
            verticalAlign: 'top',
          }}
        >
          <BuildingInfoValueText
            value={row}
            align="left"
            variant={valueVariant}
          />
        </Box>
      ) : (
        <BuildingInfoValueText value={row} variant={valueVariant} />
      )}
    </Box>
  </Box>
)

const BuildingInfoModeledEnergyClassIndicator = ({
  indicator,
}: {
  indicator: NonNullable<EnergymapBuildingInfoRow['modeledIndicator']>
}) => {
  const [open, setOpen] = React.useState(false)
  const clickOpenRef = React.useRef(false)
  const tooltipId = React.useId()
  const { t } = useTranslate('energiakartta')

  return (
    <Box
      component="span"
      data-testid="building-info-modeled-energy-class-indicator"
      data-source-properties={getSourcePropertiesData(
        indicator.sourceProperties
      )}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.1875rem',
        maxWidth: '100%',
        verticalAlign: 'middle',
        whiteSpace: 'nowrap',
      }}
    >
      <Box component="span">
        (<BuildingInfoText text={indicator.label} />)
      </Box>
      <AppTooltip
        title={
          <Box component="span">
            <BuildingInfoText text={indicator.tooltip} />
          </Box>
        }
        side="bottom"
        align="end"
        collisionAvoidance={{ side: 'flip', align: 'shift' }}
        delay={0}
        closeDelay={0}
        open={open}
        popupId={tooltipId}
        onOpenChange={(nextOpen, eventDetails) => {
          if (eventDetails.reason === 'trigger-press') {
            eventDetails.cancel()
            return
          }

          if (
            !nextOpen &&
            eventDetails.reason === 'trigger-hover' &&
            clickOpenRef.current
          ) {
            return
          }

          if (!nextOpen) {
            clickOpenRef.current = false
          }

          setOpen(nextOpen)
        }}
        popupDataSlot="building-info-modeled-energy-class-tooltip"
        popupSx={{ maxWidth: 'min(24rem, calc(100vw - 2rem))' }}
      >
        {({ ref, ...triggerProps }) => (
          <IconButton
            {...triggerProps}
            ref={ref as React.Ref<HTMLButtonElement>}
            type="button"
            size="small"
            aria-label={t(indicator.ariaLabelKey)}
            aria-describedby={open ? tooltipId : undefined}
            onClick={(event: BuildingInfoTooltipClickEvent) => {
              event.preventDefault()
              event.stopPropagation()
              event.preventBaseUIHandler?.()
              const nextOpen = !clickOpenRef.current
              clickOpenRef.current = nextOpen
              setOpen(nextOpen)
            }}
            sx={{
              width: '1rem',
              minWidth: '1rem',
              height: '1rem',
              color: '#767676',
              border: 0,
              borderRadius: '50%',
              '&:hover': {
                backgroundColor: 'transparent',
                color: '#111111',
              },
              '&:focus-visible': {
                outline: '2px solid #111111',
                outlineOffset: '2px',
              },
            }}
          >
            <QuestionCircleOutline
              aria-hidden="true"
              sx={{ width: 12, height: 12 }}
            />
          </IconButton>
        )}
      </AppTooltip>
    </Box>
  )
}

const BuildingInfoBuildingSubheaderSection = ({
  section,
}: {
  section: EnergymapBuildingInfoSection
}) => {
  const addressRow = section.rows?.find((row) => row.id === 'address')

  if (addressRow == null) {
    return null
  }

  return (
    <Box
      data-section-id={section.id}
      sx={{
        mt: '1rem',
        mb: '1.75rem',
      }}
    >
      <BuildingInfoStackedValue row={addressRow} />
    </Box>
  )
}

const BuildingInfoEnergyCertificateSection = ({
  section,
}: {
  section: EnergymapBuildingInfoSection
}) => {
  const energyClassRow = section.rows?.find((row) => row.id === 'energyClass')
  const validityRow = section.rows?.find(
    (row) => row.id === 'energyCertificateValidity'
  )
  const rows = [energyClassRow, validityRow].filter(
    (row): row is EnergymapBuildingInfoRow => row != null
  )

  if (rows.length === 0) {
    return null
  }

  return (
    <Box
      data-section-id={section.id}
      sx={{
        mt: '1.75rem',
      }}
    >
      <BuildingInfoSectionDivider />
      <Box
        sx={{
          py: '0.875rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
        }}
      >
        {rows.map((row) => (
          <BuildingInfoSectionLine
            key={row.id}
            row={row}
            valueVariant={
              row.id === 'energyClass' ? 'energyClassBadge' : 'default'
            }
          />
        ))}
      </Box>
    </Box>
  )
}

const BuildingInfoPreviousEnergyClassSection = ({
  section,
}: {
  section: EnergymapBuildingInfoSection
}) => {
  const previousClassRow = section.rows?.find(
    (row) => row.id === 'previousEnergyClass'
  )
  const measuresRow = section.rows?.find(
    (row) => row.id === 'energyClassMeasures'
  )

  if (previousClassRow == null && measuresRow == null) {
    return null
  }

  return (
    <Box
      data-section-id={section.id}
      sx={{
        mt: '1.75rem',
      }}
    >
      <BuildingInfoSectionDivider />
      <Box sx={{ py: '0.875rem' }}>
        {previousClassRow != null && (
          <BuildingInfoSectionLine
            row={previousClassRow}
            valueVariant="energyClassBadge"
          />
        )}
        {measuresRow != null && (
          <Box
            data-section-row-id={measuresRow.id}
            sx={{
              mt: '1.375rem',
            }}
          >
            <Box
              sx={{
                ...textSx,
                color: '#111111',
              }}
            >
              <BuildingInfoText text={measuresRow.label} />
            </Box>
            <Box
              component="div"
              sx={{
                ...textSx,
                mt: '0.375rem',
                color: '#111111',
              }}
            >
              <BuildingInfoValueText value={measuresRow} align="left" />
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  )
}

const BuildingInfoMeasureListSection = ({
  section,
}: {
  section: EnergymapBuildingInfoSection
}) => {
  const rows = section.rows ?? []

  if (rows.length === 0) {
    return null
  }

  return (
    <Box
      data-section-id={section.id}
      sx={{
        mt: '1.75rem',
      }}
    >
      <BuildingInfoSectionDivider />
      <Box sx={{ py: '0.875rem' }}>
        {rows.map((row) => (
          <Box key={row.id} data-section-row-id={row.id}>
            <Box
              sx={{
                ...textSx,
                color: '#111111',
              }}
            >
              <BuildingInfoText text={row.label} />
            </Box>
            <Box
              component="div"
              sx={{
                ...textSx,
                mt: '0.375rem',
                color: '#111111',
              }}
            >
              <BuildingInfoValueText value={row} align="left" />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}

const BuildingInfoMetricValueRow = ({
  value,
  showNote = false,
}: {
  value: EnergymapBuildingInfoMetricValue
  showNote?: boolean
}) => (
  <Box
    data-metric-value-id={value.id}
    data-provenance-id={value.provenance?.id}
    data-provenance-input-ids={value.provenance?.inputIds?.join(' ')}
    data-source-properties={value.sourceProperties?.join(' ')}
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, auto)',
      columnGap: '0.75rem',
      alignItems: 'baseline',
      borderTop: '0.3px solid #d7d7d7',
      py: '0.625rem',
    }}
  >
    <Box sx={{ ...textSx, color: '#111111' }}>
      <BuildingInfoText text={value.label} />
    </Box>
    <Box component="div" sx={{ ...textSx, textAlign: 'right' }}>
      <BuildingInfoValueText value={value} />
    </Box>
    {showNote && value.note != null && (
      <Box
        data-testid="building-info-certificate-value-note"
        data-metric-value-note-for={value.id}
        sx={{ gridColumn: '1 / -1', minWidth: 0 }}
      >
        <BuildingInfoNoteText
          note={{
            text: value.note,
            status: value.status,
            sourceProperties: value.note.sourceProperties,
            provenance: value.note.provenance,
          }}
        />
      </Box>
    )}
  </Box>
)

const getAnnualPrimaryMetricValue = (
  value: EnergymapBuildingInfoValue
): EnergymapBuildingInfoMetricValue => ({
  id: 'annualTotal',
  label: ENERGY_ANNUAL_TOTAL_LABEL,
  ...value,
})

const getPrimaryMetricButtonWidth = ({
  metricId,
  active,
}: {
  metricId: EnergymapBuildingInfoPrimaryMetricId
  active: boolean
}) => {
  if (active) {
    if (metricId === 'co2') {
      return '170px'
    }

    if (metricId === 'cost') {
      return '130px'
    }

    return metricId === 'energy' ? '140px' : '104px'
  }

  return metricId === 'co2' ? '42px' : '32px'
}

const BuildingInfoPrimaryMetricButton = ({
  metric,
  active,
  onClick,
}: {
  metric: EnergymapBuildingInfoPrimaryMetric
  active: boolean
  onClick: () => void
}) => {
  const { t } = useTranslate('energiakartta')
  const label = (
    <Box component="span">
      <BuildingInfoText text={metric.label} />
    </Box>
  )
  const renderButton = (triggerProps?: BuildingInfoTooltipTriggerProps) => (
    <ButtonBase
      {...triggerProps}
      component="button"
      type="button"
      aria-label={t(metric.ariaLabelKey)}
      aria-pressed={active}
      data-primary-metric-id={metric.id}
      onClick={onClick}
      sx={{
        width: getPrimaryMetricButtonWidth({ metricId: metric.id, active }),
        minWidth: getPrimaryMetricButtonWidth({ metricId: metric.id, active }),
        height: active ? '24px' : '20px',
        minHeight: active ? '24px' : '20px',
        px: active ? '0.625rem' : 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: active ? '0.5rem' : 0,
        borderRadius: active ? '15px' : '10px',
        border: active ? '0.5px solid #075cff' : 0,
        backgroundColor: active ? '#075cff' : '#f0f0f0',
        color: active ? '#ffffff' : '#111111',
        boxShadow: active ? '0 1px 4px rgba(2, 2, 2, 0.25)' : 'none',
        transition:
          'width 160ms ease, background-color 160ms ease, color 160ms ease',
        '&:hover': {
          backgroundColor: active ? '#075cff' : '#e8e8e8',
        },
        '&:focus-visible': {
          outline: '2px solid #111111',
          outlineOffset: '2px',
        },
      }}
    >
      <EnergyPrimaryMetricIcon metricId={metric.id} active={active} />
      {active && (
        <Box
          component="span"
          sx={{
            ...energyControlTextSx,
            color: '#ffffff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Box>
      )}
    </ButtonBase>
  )

  if (active) {
    return renderButton()
  }

  return (
    <BuildingInfoTooltip title={label} side="top">
      {(triggerProps) => renderButton(triggerProps)}
    </BuildingInfoTooltip>
  )
}

const BuildingInfoEnergySubmetricButton = ({
  submetric,
  selected,
  onClick,
}: {
  submetric: EnergymapBuildingInfoEnergySubmetric
  selected: boolean
  onClick: () => void
}) => {
  const { t } = useTranslate('energiakartta')

  return (
    <ButtonBase
      component="button"
      type="button"
      aria-label={t(submetric.ariaLabelKey)}
      aria-pressed={selected}
      data-energy-submetric-id={submetric.id}
      onClick={onClick}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '0.5rem',
        width: 'fit-content',
        maxWidth: '100%',
        minHeight: '20px',
        p: 0,
        color: '#111111',
        textAlign: 'left',
        '&:focus-visible': {
          outline: '2px solid #111111',
          outlineOffset: '3px',
        },
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          minWidth: '28px',
          height: '20px',
          borderRadius: '10px',
          border: '0.5px solid #075cff',
          backgroundColor: selected ? '#075cff' : 'transparent',
          color: selected ? '#ffffff' : '#075cff',
        }}
      >
        <EnergySubmetricIcon submetricId={submetric.id} selected={selected} />
      </Box>
      <Box
        component="span"
        sx={{
          ...energyControlTextSx,
          color: '#111111',
          maxWidth: '12rem',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        <BuildingInfoText text={submetric.label} />
      </Box>
    </ButtonBase>
  )
}

const parseResidentCount = (rawValue: string) => {
  if (rawValue.trim() === '') {
    return null
  }

  const value = Number(rawValue)
  return Number.isFinite(value) && Number.isInteger(value) ? value : null
}

const normalizeResidentCountOnCommit = ({
  rawValue,
  defaultValue,
  minValue,
  maxValue,
}: {
  rawValue: string
  defaultValue: number
  minValue: number
  maxValue: number
}) => {
  const value = parseResidentCount(rawValue)
  if (value == null) {
    return defaultValue
  }

  return Math.min(maxValue, Math.max(minValue, value))
}

const getValidManualResidentCount = ({
  rawValue,
  minValue,
  maxValue,
}: {
  rawValue: string
  minValue: number
  maxValue: number
}) => {
  const value = parseResidentCount(rawValue)
  if (value == null || value < minValue || value > maxValue) {
    return null
  }

  return value
}

const BuildingInfoWaterResidentControl = ({
  metric,
}: {
  metric: EnergymapBuildingInfoPrimaryMetric
}) => {
  const control = metric.residentCountControl
  const { formatNumber } = useLocaleFormatter()
  const [isOverrideEnabled, setIsOverrideEnabled] = React.useState(false)
  const [manualResidentCountRawValue, setManualResidentCountRawValue] =
    React.useState(String(control?.defaultValue ?? ''))
  const residentLabelId = React.useId()
  const effectiveWaterProjectionContext = React.useContext(
    BuildingInfoEffectiveWaterProjectionContext
  )
  const pendingInvalidCommitRawValueRef = React.useRef<string | null>(null)
  const onEffectiveWaterProjectionChange =
    effectiveWaterProjectionContext?.onProjectionChange
  const provenanceDisclosureState =
    effectiveWaterProjectionContext?.provenanceDisclosureState ?? 'closed'
  const getProvenanceDisclosureState =
    effectiveWaterProjectionContext?.getProvenanceDisclosureState
  const manualResidentCount =
    control == null
      ? null
      : getValidManualResidentCount({
          rawValue: manualResidentCountRawValue,
          minValue: control.minValue,
          maxValue: control.maxValue,
        })
  const projection = React.useMemo(
    () =>
      control == null || metric.value == null
        ? undefined
        : getEnergymapEffectiveWaterProjection({
            value: metric.value,
            residentCountControl: control,
            isOverrideEnabled,
            manualResidentCount,
          }),
    [control, isOverrideEnabled, manualResidentCount, metric.value]
  )

  React.useEffect(() => {
    onEffectiveWaterProjectionChange?.(projection)
  }, [onEffectiveWaterProjectionChange, projection])

  React.useEffect(
    () => () => {
      onEffectiveWaterProjectionChange?.(undefined)
    },
    [onEffectiveWaterProjectionChange]
  )

  React.useEffect(() => {
    const pendingRawValue = pendingInvalidCommitRawValueRef.current
    if (pendingRawValue == null || projection == null) {
      return
    }

    if (provenanceDisclosureState === 'open') {
      pendingInvalidCommitRawValueRef.current = null
      return
    }

    if (provenanceDisclosureState !== 'closed') {
      return
    }

    const pendingControl = projection.residentCountControl
    pendingInvalidCommitRawValueRef.current = null
    setManualResidentCountRawValue(
      String(
        normalizeResidentCountOnCommit({
          rawValue: pendingRawValue,
          defaultValue: pendingControl.defaultValue,
          minValue: pendingControl.minValue,
          maxValue: pendingControl.maxValue,
        })
      )
    )
  }, [projection, provenanceDisclosureState])

  if (control == null || projection == null) {
    return null
  }

  const effectiveControl = projection.residentCountControl
  const value =
    projection.calculationResult.status === 'complete'
      ? {
          ...projection.value,
          text: {
            type: 'plain' as const,
            text: formatNumber(
              projection.calculationResult.cubicMetersPerYear,
              {
                maximumFractionDigits: 1,
              }
            ),
          },
        }
      : projection.value

  const resetOverride = () => {
    setIsOverrideEnabled(false)
    setManualResidentCountRawValue(String(control.defaultValue))
  }

  return (
    <Box
      data-testid="building-info-primary-metric-value"
      data-primary-metric-id={metric.id}
      data-primary-metric-supported="true"
      sx={{ mt: '1.5rem' }}
    >
      <BuildingInfoMetricValueRow value={getAnnualPrimaryMetricValue(value)} />
      <Box
        data-testid="building-info-water-resident-control"
        data-provenance-id={effectiveControl.provenance?.id}
        data-provenance-input-ids={effectiveControl.provenance?.inputIds?.join(
          ' '
        )}
        data-source-properties={effectiveControl.sourceProperties?.join(' ')}
        sx={{
          mt: '0.75rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: '0.625rem',
        }}
      >
        <Box
          data-testid="building-info-water-description"
          data-status="estimate"
          sx={{ ...textSx, color: STATUS_SX.estimate.color }}
        >
          <BuildingInfoText text={effectiveControl.description} />
        </Box>
        <Box
          data-testid="building-info-water-resident-row"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 4.75rem',
            columnGap: isOverrideEnabled ? '1.75rem' : '0.75rem',
            alignItems: 'center',
            width: '100%',
            minHeight: '1.5rem',
          }}
        >
          <Box id={residentLabelId} sx={{ ...textSx, color: '#111111' }}>
            <BuildingInfoText text={effectiveControl.label} />
          </Box>
          <Box
            data-testid="building-info-water-resident-value-slot"
            data-override-enabled={isOverrideEnabled ? 'true' : 'false'}
            sx={{
              width: '4.75rem',
              minWidth: '4.75rem',
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            {isOverrideEnabled ? (
              <NumberInputField
                applyNegativeMargins
                size="small"
                value={manualResidentCount ?? effectiveControl.defaultValue}
                minValue={effectiveControl.minValue}
                maxValue={effectiveControl.maxValue}
                incrementStepValue={1}
                format={{ maximumFractionDigits: 0 }}
                rawValue={manualResidentCountRawValue}
                containerSx={{ width: '4.75rem' }}
                formControlSx={{ width: '100%' }}
                inputSx={{
                  '& [data-slot="number-input-input"]': {
                    px: '0.5rem',
                  },
                }}
                inputSlotProps={{
                  inputMode: 'numeric',
                  'aria-labelledby': residentLabelId,
                }}
                onRawValueChange={(rawValue) => {
                  setManualResidentCountRawValue(rawValue)
                }}
                onRawValueCommitted={(rawValue) => {
                  const isInvalidActiveInput =
                    getValidManualResidentCount({
                      rawValue,
                      minValue: effectiveControl.minValue,
                      maxValue: effectiveControl.maxValue,
                    }) == null

                  const currentProvenanceDisclosureState =
                    getProvenanceDisclosureState?.() ??
                    provenanceDisclosureState

                  if (
                    isInvalidActiveInput &&
                    currentProvenanceDisclosureState !== 'closed'
                  ) {
                    // Preserve invalid active input whether blur happens before
                    // the activating click or when opening focus reaches the
                    // heading. A canceled pointer gesture is normalized by the
                    // disclosure-state effect above.
                    pendingInvalidCommitRawValueRef.current =
                      currentProvenanceDisclosureState === 'pointerPending'
                        ? rawValue
                        : null
                    return
                  }

                  pendingInvalidCommitRawValueRef.current = null
                  setManualResidentCountRawValue(
                    String(
                      normalizeResidentCountOnCommit({
                        rawValue,
                        defaultValue: effectiveControl.defaultValue,
                        minValue: effectiveControl.minValue,
                        maxValue: effectiveControl.maxValue,
                      })
                    )
                  )
                }}
                onValueChange={(nextValue) => {
                  setManualResidentCountRawValue(
                    nextValue == null ? '' : String(nextValue)
                  )
                }}
              />
            ) : (
              <Box
                data-testid="building-info-water-resident-default"
                sx={{
                  ...textSx,
                  width: '100%',
                  fontWeight: 700,
                  textAlign: 'right',
                }}
              >
                {formatNumber(effectiveControl.defaultValue, {
                  maximumFractionDigits: 0,
                })}
              </Box>
            )}
          </Box>
        </Box>
        <SquishedSwitchWithLabel
          checked={isOverrideEnabled}
          sx={{ width: 'fit-content', maxWidth: '100%' }}
          labelSx={{
            ...textSx,
            ml: '0.625rem',
            color: '#111111',
          }}
          onChange={(_event, checked) => {
            if (!checked) {
              resetOverride()
              return
            }

            setManualResidentCountRawValue(String(control.defaultValue))
            setIsOverrideEnabled(true)
          }}
        >
          <BuildingInfoText text={effectiveControl.toggleLabel} />
        </SquishedSwitchWithLabel>
      </Box>
    </Box>
  )
}

const BuildingInfoPrimaryMetricValuePanel = ({
  metric,
}: {
  metric: EnergymapBuildingInfoPrimaryMetric
}) => {
  if (metric.value == null && metric.unavailableNote == null) {
    return null
  }

  if (metric.id === 'water' && metric.residentCountControl != null) {
    return <BuildingInfoWaterResidentControl metric={metric} />
  }

  return (
    <Box
      data-testid="building-info-primary-metric-value"
      data-primary-metric-id={metric.id}
      data-primary-metric-supported={metric.supported ? 'true' : 'false'}
      sx={{ mt: '1.5rem' }}
    >
      {metric.value != null && (
        <BuildingInfoMetricValueRow
          value={getAnnualPrimaryMetricValue(metric.value)}
        />
      )}
      {metric.unavailableNote != null && (
        <BuildingInfoNoteText note={metric.unavailableNote} />
      )}
    </Box>
  )
}

const BuildingInfoEnergyConsumptionSection = ({
  section,
  accentColor,
}: {
  section: EnergymapBuildingInfoSection
  accentColor: string
}) => {
  const controls = section.consumptionControls

  if (controls == null) {
    return null
  }

  return (
    <BuildingInfoEnergyConsumptionSectionContent
      key={getConsumptionControlsStateKey(controls)}
      section={section}
      controls={controls}
      accentColor={accentColor}
    />
  )
}

const BuildingInfoEnergyConsumptionSectionContent = ({
  section,
  controls,
  accentColor,
}: {
  section: EnergymapBuildingInfoSection
  controls: EnergymapBuildingInfoConsumptionControls
  accentColor: string
}) => {
  const [requestedPrimaryMetricId, setRequestedPrimaryMetricId] =
    React.useState<EnergymapBuildingInfoPrimaryMetricId>(
      controls?.defaultPrimaryMetricId ?? 'energy'
    )
  const [requestedEnergySubmetricIds, setRequestedEnergySubmetricIds] =
    React.useState<EnergymapBuildingInfoEnergySubmetricId[]>(
      controls?.defaultEnergySubmetricIds ?? []
    )

  const activePrimaryMetricId = getNormalizedPrimaryMetricId(
    controls,
    requestedPrimaryMetricId
  )
  const selectedEnergySubmetricIds = normalizeEnergySubmetricSelection({
    controls,
    selectedSubmetricIds: requestedEnergySubmetricIds,
  })

  const primaryMetricById = new Map(
    controls.primaryMetrics.map((metric) => [metric.id, metric])
  )
  const sortedPrimaryMetrics = ENERGY_PRIMARY_METRIC_ORDER.map((metricId) =>
    primaryMetricById.get(metricId)
  ).filter(
    (metric): metric is EnergymapBuildingInfoPrimaryMetric => metric != null
  )
  const energySubmetricById = new Map(
    (controls.energySubmetrics ?? []).map((submetric) => [
      submetric.id,
      submetric,
    ])
  )
  const sortedEnergySubmetrics = ENERGY_SUBMETRIC_ORDER.map((submetricId) =>
    energySubmetricById.get(submetricId)
  ).filter(
    (submetric): submetric is EnergymapBuildingInfoEnergySubmetric =>
      submetric != null
  )
  const activePrimaryMetric =
    primaryMetricById.get(activePrimaryMetricId) ??
    primaryMetricById.get(controls.defaultPrimaryMetricId)
  const selectedEnergyConsumption = getSelectedEnergyConsumption({
    controls,
    selectedSubmetricIds: selectedEnergySubmetricIds,
  })
  const selectedSubmetricIds = new Set(selectedEnergySubmetricIds)
  const unavailableNotes = [
    ...selectedEnergyConsumption.notes,
    ...(section.notes ?? []),
  ]

  const toggleEnergySubmetric = (
    submetricId: EnergymapBuildingInfoEnergySubmetricId
  ) => {
    setRequestedEnergySubmetricIds((current) => {
      const normalized = normalizeEnergySubmetricSelection({
        controls,
        selectedSubmetricIds: current,
      })

      return normalized.includes(submetricId)
        ? normalized.filter((id) => id !== submetricId)
        : normalizeEnergySubmetricSelection({
            controls,
            selectedSubmetricIds: [submetricId, ...normalized],
          })
    })
  }

  return (
    <Box
      data-section-id={section.id}
      data-testid="building-info-energy-consumption-section"
      sx={{
        mt: '2.25rem',
      }}
    >
      {section.title != null && (
        <Box
          sx={{
            ...textSx,
            mb: '1rem',
            color: accentColor,
            textTransform: 'uppercase',
          }}
        >
          <BuildingInfoText text={section.title} />
        </Box>
      )}
      {sortedPrimaryMetrics.length > 0 && (
        <Box
          data-testid="building-info-primary-metric-row"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            width: '284px',
            maxWidth: '100%',
            minHeight: '24px',
          }}
        >
          {sortedPrimaryMetrics.map((metric) => (
            <BuildingInfoPrimaryMetricButton
              key={metric.id}
              metric={metric}
              active={metric.id === activePrimaryMetricId}
              onClick={() => setRequestedPrimaryMetricId(metric.id)}
            />
          ))}
        </Box>
      )}
      {activePrimaryMetric?.id === 'energy' ? (
        <>
          {sortedEnergySubmetrics.length > 0 && (
            <Box
              data-testid="building-info-energy-submetric-row"
              sx={{
                mt: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '1.25rem',
              }}
            >
              {sortedEnergySubmetrics.map((submetric) => (
                <BuildingInfoEnergySubmetricButton
                  key={submetric.id}
                  submetric={submetric}
                  selected={selectedSubmetricIds.has(submetric.id)}
                  onClick={() => toggleEnergySubmetric(submetric.id)}
                />
              ))}
            </Box>
          )}
          {selectedEnergyConsumption.values.length > 0 && (
            <Box
              data-testid="building-info-energy-consumption-values"
              sx={{
                mt: '1.5rem',
              }}
            >
              {selectedEnergyConsumption.values.map((value) => (
                <BuildingInfoMetricValueRow key={value.id} value={value} />
              ))}
            </Box>
          )}
          {unavailableNotes.map((note) => (
            <BuildingInfoNoteText key={note.id} note={note} />
          ))}
        </>
      ) : activePrimaryMetric != null ? (
        <BuildingInfoPrimaryMetricValuePanel metric={activePrimaryMetric} />
      ) : null}
    </Box>
  )
}

const BuildingInfoMetricBlock = ({
  metric,
  accentColor,
}: {
  metric: EnergymapBuildingInfoMetric
  accentColor: string
}) => {
  if (metric.values.length === 0) {
    return null
  }

  return (
    <Box
      data-metric-id={metric.id}
      sx={{
        mt: '1.5rem',
      }}
    >
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          maxWidth: '100%',
          minHeight: '1.5rem',
          px: '0.75rem',
          border: `0.5px solid ${accentColor}`,
          borderRadius: '15px',
          backgroundColor: metric.id === 'total' ? accentColor : 'transparent',
        }}
      >
        <Box
          sx={{
            fontSize: '0.5625rem',
            fontWeight: 400,
            lineHeight: '0.875rem',
            letterSpacing: '0.18em',
            color: metric.id === 'total' ? '#ffffff' : '#111111',
          }}
        >
          <BuildingInfoText text={metric.label} />
        </Box>
      </Box>
      <Box sx={{ mt: '0.75rem' }}>
        {metric.values.map((value) => (
          <BuildingInfoMetricValueRow key={value.id} value={value} />
        ))}
      </Box>
    </Box>
  )
}

const BuildingInfoScenarioBlock = ({
  scenario,
}: {
  scenario: EnergymapBuildingInfoScenario
}) => {
  const savingsValue = scenario.values.find(
    (value) => value.id === 'savingsPercent'
  )
  const remainingValues = scenario.values.filter(
    (value) => value.id !== 'savingsPercent'
  )
  const graphic = RENOVATION_SCENARIO_GRAPHICS[scenario.id]

  if (scenario.values.length === 0) {
    return null
  }

  return (
    <Box
      data-scenario-id={scenario.id}
      sx={{
        mt: '2rem',
        pt: '1.25rem',
        borderTop: '0.3px solid #cfcfcf',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box
            sx={{
              ...textSx,
              color: '#111111',
              fontWeight: 400,
            }}
          >
            <BuildingInfoText text={scenario.label} />
          </Box>
        </Box>
        {savingsValue != null && (
          <Box
            sx={{
              px: '0.75rem',
              py: '0.125rem',
              borderRadius: '12px',
              backgroundColor: 'rgba(163, 71, 255, 0.1)',
              whiteSpace: 'nowrap',
            }}
          >
            <Box sx={{ ...textSx, color: '#a347ff' }}>
              <BuildingInfoValueText value={savingsValue} />
            </Box>
          </Box>
        )}
      </Box>
      <Box
        sx={{
          mt: '1rem',
          display: 'flex',
          flexDirection: { mobile: 'column', desktop: 'row' },
          alignItems: { mobile: 'stretch', desktop: 'flex-start' },
          gap: { mobile: '1rem', desktop: '1.25rem' },
        }}
      >
        <Box sx={{ flex: '1 1 auto', minWidth: 0 }}>
          {remainingValues.map((value) => (
            <BuildingInfoMetricValueRow key={value.id} value={value} />
          ))}
        </Box>
        {graphic != null && (
          <BuildingInfoFigmaGraphic
            src={graphic.src}
            dimensions={graphic.dimensions}
            maxWidth="38vw"
            testId={graphic.testId}
            sx={{
              alignSelf: { mobile: 'center', desktop: 'flex-start' },
              mt: { mobile: '0.25rem', desktop: '-2.5rem' },
            }}
          />
        )}
      </Box>
    </Box>
  )
}

const BuildingInfoCertificateContextRow = ({
  row,
}: {
  row: EnergymapBuildingInfoRow
}) => (
  <Box
    component="div"
    data-row-id={row.id}
    data-provenance-id={row.provenance?.id}
    data-provenance-input-ids={row.provenance?.inputIds?.join(' ')}
    data-source-properties={getSourcePropertiesData(row.sourceProperties)}
    sx={{
      display: 'grid',
      gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
      columnGap: '0.75rem',
      alignItems: 'start',
      borderTop: '0.3px solid #cfcfcf',
      py: '0.625rem',
    }}
  >
    <Box
      component="dt"
      sx={{
        ...textSx,
        m: 0,
        minWidth: 0,
        color: '#111111',
        overflowWrap: 'anywhere',
      }}
    >
      <BuildingInfoText text={row.label} />
    </Box>
    <Box
      component="dd"
      sx={{
        ...textSx,
        m: 0,
        minWidth: 0,
        textAlign: 'right',
      }}
    >
      <BuildingInfoValueText value={row} />
      {row.note != null && (
        <BuildingInfoNoteText
          note={{
            text: row.note,
            status: row.status,
            sourceProperties: row.note.sourceProperties,
            provenance: row.note.provenance,
          }}
        />
      )}
    </Box>
  </Box>
)

const BuildingInfoCertificateConsumptionSection = ({
  section,
  accentColor,
}: {
  section: EnergymapBuildingInfoSection
  accentColor: string
}) => {
  const headingId = React.useId()
  const rows = section.rows ?? []
  const metrics = section.metrics ?? []

  if (rows.length === 0 && metrics.length === 0) {
    return null
  }

  return (
    <Box
      component="section"
      aria-labelledby={section.title == null ? undefined : headingId}
      data-testid="building-info-certificate-consumption"
      data-section-id={section.id}
      sx={{
        mt: '2.25rem',
        px: { mobile: '1rem', desktop: '1.25rem' },
        py: { mobile: '1.125rem', desktop: '1.25rem' },
        minWidth: 0,
        border: `0.75px solid ${accentColor}`,
        borderRadius: '0.75rem',
        backgroundColor: '#f8faff',
      }}
    >
      {section.title != null && (
        <Box
          component="h3"
          id={headingId}
          data-provenance-id={section.titleProvenance?.id}
          data-provenance-input-ids={section.titleProvenance?.inputIds?.join(
            ' '
          )}
          data-source-properties={getSourcePropertiesData(
            section.titleSourceProperties
          )}
          sx={{
            ...textSx,
            m: 0,
            color: accentColor,
            fontWeight: 700,
            textTransform: 'uppercase',
            overflowWrap: 'anywhere',
          }}
        >
          <BuildingInfoText text={section.title} />
        </Box>
      )}
      {rows.length > 0 && (
        <Box component="dl" sx={{ m: 0, mt: '1rem' }}>
          {rows.map((row) => (
            <BuildingInfoCertificateContextRow key={row.id} row={row} />
          ))}
        </Box>
      )}
      {metrics.length > 0 && (
        <Box
          component="ul"
          data-testid="building-info-certificate-metrics"
          sx={{
            m: 0,
            mt: '1.25rem',
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            listStyle: 'none',
          }}
        >
          {metrics.map((metric) => {
            const isCompleteTotal = metric.id === 'certificateTotal'

            return (
              <Box
                component="li"
                key={metric.id}
                data-testid="building-info-certificate-metric"
                data-metric-id={metric.id}
                data-certificate-complete-total={
                  isCompleteTotal ? 'true' : undefined
                }
                sx={{
                  minWidth: 0,
                  p: isCompleteTotal ? '0.75rem' : 0,
                  border: isCompleteTotal
                    ? `1px solid ${accentColor}`
                    : undefined,
                  borderRadius: isCompleteTotal ? '0.625rem' : undefined,
                  backgroundColor: isCompleteTotal ? '#eaf1ff' : undefined,
                }}
              >
                <Box
                  component="h4"
                  data-provenance-id={metric.labelProvenance?.id}
                  data-provenance-input-ids={metric.labelProvenance?.inputIds?.join(
                    ' '
                  )}
                  data-source-properties={getSourcePropertiesData(
                    metric.labelSourceProperties
                  )}
                  sx={{
                    ...textSx,
                    m: 0,
                    mb: '0.5rem',
                    minWidth: 0,
                    color: '#111111',
                    fontWeight: isCompleteTotal ? 700 : 400,
                    overflowWrap: 'anywhere',
                  }}
                >
                  <BuildingInfoText text={metric.label} />
                </Box>
                {metric.values.map((value) => (
                  <BuildingInfoMetricValueRow
                    key={value.id}
                    value={value}
                    showNote
                  />
                ))}
              </Box>
            )
          })}
        </Box>
      )}
      {section.notes?.map((note) => (
        <BuildingInfoNoteText key={note.id} note={note} />
      ))}
    </Box>
  )
}

const BuildingInfoSectionBlock = ({
  section,
  accentColor,
}: {
  section: EnergymapBuildingInfoSection
  accentColor: string
}) => {
  const showComparisonIcon = section.id === 'scenarioComparison'
  const rows = section.rows ?? []
  const hasOnlyRowContent =
    rows.length > 0 &&
    section.title == null &&
    section.description == null &&
    (section.metrics?.length ?? 0) === 0 &&
    section.consumptionControls == null &&
    (section.scenarios?.length ?? 0) === 0 &&
    (section.notes?.length ?? 0) === 0
  const hasOnlyKnownRowContent = (knownRowIds: readonly string[]) =>
    hasOnlyRowContent && rows.every((row) => knownRowIds.includes(row.id))

  if (
    section.variant === 'buildingSubheader' &&
    hasOnlyKnownRowContent(['address'])
  ) {
    return <BuildingInfoBuildingSubheaderSection section={section} />
  }

  if (
    section.variant === 'energyCertificate' &&
    hasOnlyKnownRowContent(['energyClass', 'energyCertificateValidity'])
  ) {
    return <BuildingInfoEnergyCertificateSection section={section} />
  }

  if (
    section.variant === 'previousEnergyClass' &&
    hasOnlyKnownRowContent(['previousEnergyClass', 'energyClassMeasures'])
  ) {
    return <BuildingInfoPreviousEnergyClassSection section={section} />
  }

  if (section.variant === 'measureList' && hasOnlyRowContent) {
    return <BuildingInfoMeasureListSection section={section} />
  }

  if (section.variant === 'energyCertificateConsumption') {
    return (
      <BuildingInfoCertificateConsumptionSection
        section={section}
        accentColor={accentColor}
      />
    )
  }

  if (section.consumptionControls != null) {
    return (
      <BuildingInfoEnergyConsumptionSection
        section={section}
        accentColor={accentColor}
      />
    )
  }

  if (
    section.id === 'calculationContext' &&
    section.title != null &&
    rows.length > 0 &&
    section.description == null &&
    (section.metrics?.length ?? 0) === 0 &&
    section.consumptionControls == null &&
    (section.scenarios?.length ?? 0) === 0 &&
    (section.notes?.length ?? 0) === 0
  ) {
    return (
      <BuildingInfoCalculationContextAccordion
        section={section}
        accentColor={accentColor}
      />
    )
  }

  return (
    <Box
      data-section-id={section.id}
      sx={{
        mt: '2.25rem',
      }}
    >
      {showComparisonIcon && (
        <RenovationIcon
          width="31px"
          height="25px"
          sx={{
            mb: '2.125rem',
          }}
        />
      )}
      {section.title != null && (
        <Box
          sx={{
            ...textSx,
            mb: '1rem',
            color: accentColor,
            textTransform: 'uppercase',
          }}
        >
          <BuildingInfoText text={section.title} />
        </Box>
      )}
      {section.description != null && (
        <Box
          sx={{
            ...textSx,
            mb: '1.25rem',
            color: '#111111',
          }}
        >
          <BuildingInfoText text={section.description} />
        </Box>
      )}
      {section.rows?.map((row) =>
        row.presentation === 'expandableSourceText' ? (
          <BuildingInfoExpandableSourceTextRow key={row.id} row={row} />
        ) : (
          <BuildingInfoRow key={row.id} row={row} />
        )
      )}
      {section.metrics?.map((metric) => (
        <BuildingInfoMetricBlock
          key={metric.id}
          metric={metric}
          accentColor={accentColor}
        />
      ))}
      {section.scenarios?.map((scenario) => (
        <BuildingInfoScenarioBlock key={scenario.id} scenario={scenario} />
      ))}
      {section.notes?.map((note) => (
        <BuildingInfoNoteText key={note.id} note={note} />
      ))}
    </Box>
  )
}

const BuildingInfoPanelHeadingGraphic = ({
  panelId,
}: {
  panelId: EnergymapBuildingInfoPanelId
}) => {
  if (panelId === 'energyConsumption') {
    return (
      <BuildingInfoDecorativeImage
        src={BUILDING_INFO_ASSETS.energyLightning}
        width="18px"
        height="28px"
        sx={{
          position: 'absolute',
          top: 'var(--building-info-heading-graphic-top, 3.125rem)',
          left: 0,
        }}
      />
    )
  }

  if (panelId === 'renovationRecommendations') {
    return (
      <RenovationIcon
        sx={{
          position: 'absolute',
          top: 'var(--building-info-heading-graphic-top, 3.25rem)',
          left: 0,
        }}
      />
    )
  }

  return null
}

const BuildingInfoPanelHeroGraphic = ({
  panelId,
}: {
  panelId: EnergymapBuildingInfoPanelId
}) => {
  if (panelId !== 'renovationRecommendations') {
    return null
  }

  return (
    <BuildingInfoFigmaGraphic
      src={BUILDING_INFO_ASSETS.renovationBuilding}
      dimensions={BUILDING_INFO_GRAPHIC_DIMENSIONS.renovationBuilding}
      testId="building-info-graphic-renovation-building"
      sx={{
        mt: '2.75rem',
        mb: '2.75rem',
        mx: 'auto',
      }}
    />
  )
}

const BuildingInfoPanelBody = ({
  detailsFooter,
  panel,
  titleId,
  accentColor,
  sections = panel.sections,
  showDescription = true,
  showHeroGraphic = true,
  sx,
}: {
  detailsFooter?: React.ReactNode
  panel: EnergymapBuildingInfoPanel
  titleId: string
  accentColor: string
  sections?: EnergymapBuildingInfoSection[]
  showDescription?: boolean
  showHeroGraphic?: boolean
  sx?: AppSxProps
}) => {
  if (sections.length === 0) {
    return null
  }

  return (
    <Box
      sx={[
        {
          boxSizing: 'border-box',
          position: 'relative',
        },
        ...toSxArray(sx),
      ]}
    >
      <BuildingInfoPanelHeadingGraphic panelId={panel.id} />
      <Box
        id={titleId}
        sx={{
          fontSize: '0.75rem',
          fontWeight: 400,
          lineHeight: '1.125rem',
          letterSpacing: '0.1em',
          color: accentColor,
          textTransform: 'uppercase',
          whiteSpace: 'normal',
        }}
      >
        <BuildingInfoText text={panel.title} />
      </Box>
      <Box
        sx={{
          mt: 'var(--building-info-heading-divider-mt, 1.375rem)',
          borderTop: '0.3px solid #cfcfcf',
        }}
      />
      {showHeroGraphic && <BuildingInfoPanelHeroGraphic panelId={panel.id} />}
      {showDescription && panel.description != null && (
        <Box
          sx={{
            ...textSx,
            mt: panel.id === 'renovationRecommendations' ? 0 : '1.875rem',
            color: '#111111',
          }}
        >
          <BuildingInfoText text={panel.description} />
        </Box>
      )}
      {sections.map((section) => (
        <BuildingInfoSectionBlock
          key={section.id}
          section={section}
          accentColor={accentColor}
        />
      ))}
      {panel.id === 'buildingDetails' && detailsFooter}
    </Box>
  )
}

const getTabPagePanelAccentColor = ({
  tabId,
  panelId,
}: {
  tabId: BuildingInfoTabId
  panelId: EnergymapBuildingInfoPanelId
}) =>
  tabId === 'renovation' && panelId === 'buildingDetails'
    ? '#111111'
    : PANEL_ACCENTS[panelId]

const getStackedTabPagePanelContentSx = ({
  panelId,
  index,
  panelCount,
}: {
  panelId: EnergymapBuildingInfoPanelId
  index: number
  panelCount: number
}): AppSxProps => ({
  width: {
    mobile: 'min(16.25rem, calc(100vw - 6rem))',
    desktop: `min(${PANEL_CONTENT_WIDTHS[panelId]}, calc(100% - 5rem))`,
  },
  maxWidth: '100%',
  mx: 'auto',
  pt: {
    mobile: index === 0 ? '7.5rem' : '6.25rem',
    desktop: index === 0 ? '6.25rem' : '5rem',
  },
  pb: {
    mobile: index === panelCount - 1 ? '8rem' : '5rem',
    desktop: index === panelCount - 1 ? '6.5rem' : '5rem',
  },
})

const getDesktopGridPanelContentSx = ({
  panelId,
}: {
  panelId: EnergymapBuildingInfoPanelId
}): AppSxProps => ({
  width: `min(${PANEL_CONTENT_WIDTHS[panelId]}, calc(100% - 3rem))`,
  maxWidth: '100%',
  pt: DESKTOP_HEADING_TOP,
  pb: DESKTOP_SECTION_BOTTOM_PADDING,
  mx: 'auto',
  '--building-info-heading-graphic-top': DESKTOP_HEADING_GRAPHIC_TOP,
  '--building-info-heading-divider-mt': DESKTOP_HEADING_DIVIDER_MARGIN_TOP,
})

const BuildingInfoPanelSection = ({
  detailsFooter,
  panel,
  tabId,
  bodySx,
  sections,
  showDescription,
  showHeroGraphic,
  sx,
}: {
  detailsFooter?: React.ReactNode
  panel: EnergymapBuildingInfoPanel
  tabId: BuildingInfoTabId
  bodySx?: AppSxProps
  sections?: EnergymapBuildingInfoSection[]
  showDescription?: boolean
  showHeroGraphic?: boolean
  sx?: AppSxProps
}) => {
  const titleId = React.useId()
  const presentedSections = sections ?? panel.sections
  const accentColor = getTabPagePanelAccentColor({
    tabId,
    panelId: panel.id,
  })

  if (presentedSections.length === 0) {
    return null
  }

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      data-testid={`building-info-panel-${panel.id}`}
      data-panel-id={panel.id}
      sx={[
        {
          width: '100%',
          minWidth: 0,
          minHeight: 0,
          backgroundColor: 'inherit',
          flexShrink: 0,
        },
        ...toSxArray(sx),
      ]}
    >
      <BuildingInfoPanelBody
        detailsFooter={detailsFooter}
        panel={panel}
        titleId={titleId}
        accentColor={accentColor}
        sections={presentedSections}
        showDescription={showDescription}
        showHeroGraphic={showHeroGraphic}
        sx={bodySx}
      />
    </Box>
  )
}

const BuildingInfoStackedTabPageSection = ({
  detailsFooter,
  panel,
  tabId,
  index,
  panelCount,
}: {
  detailsFooter?: React.ReactNode
  panel: EnergymapBuildingInfoPanel
  tabId: BuildingInfoTabId
  index: number
  panelCount: number
}) => {
  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        backgroundColor: PANEL_BACKGROUNDS[panel.id],
        flexShrink: 0,
      }}
    >
      <BuildingInfoPanelSection
        detailsFooter={detailsFooter}
        panel={panel}
        tabId={tabId}
        bodySx={getStackedTabPagePanelContentSx({
          panelId: panel.id,
          index,
          panelCount,
        })}
      />
    </Box>
  )
}

const BuildingInfoDesktopGrid = ({
  tab,
  children,
}: {
  tab: EnergymapBuildingInfoTabTopology
  children: React.ReactNode
}) => (
  <Box
    data-testid="building-info-grid"
    data-building-info-grid-layout={tab.id}
    data-building-info-content-width={tab.desktopContentWidthPx}
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: `min(${tab.desktopContentWidthPx}px, 100%)`,
      maxWidth: '100%',
      mx: 'auto',
      flexGrow: tab.id === 'basic' ? 1 : undefined,
      backgroundColor: '#f9f9f9',
    }}
  >
    {children}
  </Box>
)

const getDesktopPanelRegionSlot = ({
  row,
  panelId,
}: {
  row: EnergymapBuildingInfoDesktopPanelRow
  panelId: EnergymapBuildingInfoPanelId
}) => {
  if (row.id === 'basic') {
    return panelId === 'energyConsumption'
      ? 'basic-energy'
      : 'basic-building-details'
  }

  if (panelId === 'energyConsumption') {
    return 'top-energy'
  }

  return panelId === 'renovationRecommendations'
    ? 'top-renovation'
    : 'top-building-details'
}

const BuildingInfoDesktopPanelRow = ({
  detailsFooter,
  tabId,
  row,
}: {
  detailsFooter?: React.ReactNode
  tabId: BuildingInfoTabId
  row: EnergymapBuildingInfoDesktopPanelRow
}) => (
  <Box
    data-testid={`building-info-grid-row-${row.id}`}
    data-grid-row={row.id}
    data-grid-region-count={row.regions.length}
    data-grid-content-width={row.contentWidthPx}
    sx={{
      display: 'grid',
      gridTemplateColumns: row.regions
        .map(({ targetWidthPx }) => `minmax(0, ${targetWidthPx}fr)`)
        .join(' '),
      width: `min(${row.contentWidthPx}px, 100%)`,
      maxWidth: '100%',
      flexGrow: row.id === 'basic' ? 1 : undefined,
    }}
  >
    {row.regions.map((region) => {
      const slot = getDesktopPanelRegionSlot({
        row,
        panelId: region.panel.id,
      })

      return (
        <Box
          key={region.id}
          data-testid={`building-info-grid-section-${slot}`}
          data-grid-row={row.id}
          data-grid-slot={slot}
          data-panel-id={region.panel.id}
          sx={{
            minWidth: 0,
            minHeight: '100%',
            backgroundColor: PANEL_BACKGROUNDS[region.panel.id],
          }}
        >
          <BuildingInfoPanelSection
            detailsFooter={detailsFooter}
            panel={region.panel}
            tabId={tabId}
            sections={region.sections}
            sx={{ minHeight: '100%', height: '100%' }}
            bodySx={getDesktopGridPanelContentSx({
              panelId: region.panel.id,
            })}
          />
        </Box>
      )
    })}
  </Box>
)

const BuildingInfoRenovationComparisonWide = ({
  panel,
  section,
}: {
  panel: EnergymapBuildingInfoPanel
  section: EnergymapBuildingInfoSection
}) => {
  const titleId = React.useId()

  return (
    <Box
      component="section"
      aria-labelledby={section.title == null ? undefined : titleId}
      data-testid="building-info-renovation-comparison-wide"
      data-panel-id={panel.id}
      sx={{
        display: 'grid',
        gridTemplateColumns: '440fr 560fr',
        minHeight: '100%',
      }}
    >
      <Box
        sx={{
          width: 'min(22.5rem, calc(100% - 5rem))',
          maxWidth: '100%',
          ml: '5rem',
          pt: '7.5rem',
          pb: DESKTOP_SECTION_BOTTOM_PADDING,
          boxSizing: 'border-box',
        }}
      >
        <RenovationIcon width="31px" height="25px" />
        {section.title != null && (
          <Box
            id={titleId}
            sx={{
              mt: '2rem',
              fontSize: '0.75rem',
              fontWeight: 400,
              lineHeight: '1.125rem',
              letterSpacing: '0.1em',
              color: PANEL_ACCENTS.renovationRecommendations,
              textTransform: 'uppercase',
            }}
          >
            <BuildingInfoText text={section.title} />
          </Box>
        )}
        <Box
          sx={{
            mt: '1.875rem',
            borderTop: '0.3px solid #cfcfcf',
          }}
        />
        {section.description != null && (
          <Box
            sx={{
              ...textSx,
              mt: '1.875rem',
              maxWidth: '20.375rem',
              color: '#111111',
            }}
          >
            <BuildingInfoText text={section.description} />
          </Box>
        )}
      </Box>
      <Box
        sx={{
          width: `min(${PANEL_CONTENT_WIDTHS.renovationRecommendations}, calc(100% - 4rem))`,
          maxWidth: '100%',
          ml: '3.75rem',
          pt: '16.875rem',
          pb: DESKTOP_SECTION_BOTTOM_PADDING,
          boxSizing: 'border-box',
        }}
      >
        {section.rows?.map((row) =>
          row.presentation === 'expandableSourceText' ? (
            <BuildingInfoExpandableSourceTextRow key={row.id} row={row} />
          ) : (
            <BuildingInfoRow key={row.id} row={row} />
          )
        )}
        {section.metrics?.map((metric) => (
          <BuildingInfoMetricBlock
            key={metric.id}
            metric={metric}
            accentColor={PANEL_ACCENTS.renovationRecommendations}
          />
        ))}
        {section.consumptionControls != null && (
          <BuildingInfoEnergyConsumptionSection
            section={section}
            accentColor={PANEL_ACCENTS.renovationRecommendations}
          />
        )}
        {section.scenarios?.map((scenario) => (
          <BuildingInfoScenarioBlock key={scenario.id} scenario={scenario} />
        ))}
        {section.notes?.map((note) => (
          <BuildingInfoNoteText key={note.id} note={note} />
        ))}
      </Box>
    </Box>
  )
}

const BuildingInfoRenovationEffectivenessContent = () => (
  <Box
    data-testid="building-info-renovation-effectiveness-content"
    sx={{
      width: `min(${PANEL_CONTENT_WIDTHS.buildingDetails}, calc(100% - 4rem))`,
      maxWidth: '100%',
      ml: '4.375rem',
      pt: '11.75rem',
      pb: DESKTOP_SECTION_BOTTOM_PADDING,
    }}
  >
    <Box
      sx={{
        fontSize: '0.75rem',
        fontWeight: 400,
        lineHeight: '1.125rem',
        letterSpacing: '0.1em',
        color: '#111111',
        textTransform: 'uppercase',
      }}
    >
      <TText
        keyName="sidebar.building_info.panels.renovation.effectiveness.title"
        ns="energiakartta"
      />
    </Box>
    <Box
      sx={{
        mt: '0.75rem',
        borderTop: '0.3px solid #cfcfcf',
      }}
    />
    <Box
      sx={{
        ...textSx,
        mt: '2.5rem',
        color: '#111111',
        whiteSpace: 'normal',
        '& b': {
          fontWeight: 700,
        },
      }}
    >
      <TText
        keyName="sidebar.building_info.panels.renovation.effectiveness.body"
        ns="energiakartta"
      />
    </Box>
    <Box
      aria-hidden="true"
      data-testid="building-info-renovation-effectiveness-indicator"
      sx={{
        mt: '3rem',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '0.625rem',
      }}
    >
      <Box
        sx={{
          width: '25px',
          height: '10px',
          borderRadius: '5px',
          backgroundColor: '#111111',
        }}
      />
      <Box
        sx={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: '#a0a0a0',
        }}
      />
    </Box>
  </Box>
)

const BuildingInfoDesktopTabPageContent = ({
  detailsFooter,
  tab,
}: {
  detailsFooter?: React.ReactNode
  tab: EnergymapBuildingInfoTabTopology
}) => (
  <BuildingInfoDesktopGrid tab={tab}>
    {tab.desktopRows.map((row) =>
      row.kind === 'panels' ? (
        <BuildingInfoDesktopPanelRow
          key={row.id}
          tabId={tab.id}
          row={row}
          detailsFooter={detailsFooter}
        />
      ) : (
        <Box
          key={row.id}
          data-testid="building-info-grid-row-renovationComparison"
          data-grid-row={row.id}
          data-grid-region-count="2"
          sx={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1000fr) minmax(0, 440fr)',
            width: `min(${row.contentWidthPx}px, 100%)`,
            maxWidth: '100%',
          }}
        >
          <Box
            data-testid="building-info-grid-section-bottom-wide"
            data-grid-row={row.id}
            data-grid-slot="bottom-wide"
            data-panel-id={row.panel.id}
            sx={{
              minWidth: 0,
              minHeight: '100%',
              backgroundColor: PANEL_BACKGROUNDS.energyConsumption,
            }}
          >
            <BuildingInfoRenovationComparisonWide
              panel={row.panel}
              section={row.section}
            />
          </Box>
          <Box
            data-testid="building-info-grid-section-bottom-right"
            data-grid-row={row.id}
            data-grid-slot="bottom-right"
            data-panel-id={row.panel.id}
            sx={{
              minWidth: 0,
              minHeight: '100%',
              backgroundColor: RENOVATION_EFFECTIVENESS_BACKGROUND,
            }}
          >
            <BuildingInfoRenovationEffectivenessContent />
          </Box>
        </Box>
      )
    )}
  </BuildingInfoDesktopGrid>
)

const BuildingInfoStackedTabPageContent = ({
  detailsFooter,
  tabId,
  panels,
}: {
  detailsFooter?: React.ReactNode
  tabId: BuildingInfoTabId
  panels: EnergymapBuildingInfoPanel[]
}) => (
  <>
    {panels.map((panel, index) => (
      <BuildingInfoStackedTabPageSection
        detailsFooter={detailsFooter}
        key={panel.id}
        panel={panel}
        tabId={tabId}
        index={index}
        panelCount={panels.length}
      />
    ))}
  </>
)

const BuildingInfoTabPageContent = ({
  detailsFooter,
  tab,
  forceMobileLayout = false,
}: {
  detailsFooter?: React.ReactNode
  tab: EnergymapBuildingInfoTabTopology
  forceMobileLayout?: boolean
}) => {
  const isMobile = useIsMobile()
  const useMobileLayout = isMobile || forceMobileLayout
  const isDesktopBasicLayout = !useMobileLayout && tab.id === 'basic'

  return (
    <Box
      data-testid={`building-info-tab-page-${tab.id}`}
      data-building-info-tab-id={tab.id}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        flexGrow: isDesktopBasicLayout ? 1 : undefined,
        backgroundColor: '#f9f9f9',
      }}
    >
      {useMobileLayout ? (
        <BuildingInfoStackedTabPageContent
          tabId={tab.id}
          panels={tab.panels}
          detailsFooter={detailsFooter}
        />
      ) : (
        <BuildingInfoDesktopTabPageContent
          tab={tab}
          detailsFooter={detailsFooter}
        />
      )}
      {!tab.panels.some((panel) => panel.id === 'buildingDetails') && (
        <Box
          data-testid="building-info-page-footer"
          sx={{ px: '1.5rem', pb: { mobile: '8rem', desktop: '2rem' } }}
        >
          {detailsFooter}
        </Box>
      )}
    </Box>
  )
}

const BuildingInfoActiveTabSync = ({
  activeTabId,
  topology,
  onActiveTabChange,
}: {
  activeTabId?: BuildingInfoTabId
  topology: EnergymapBuildingInfoPanelTopology
  onActiveTabChange?: (tabId: BuildingInfoTabId) => void
}) => {
  const tabsContext = useNullableSidebarPanelExtensionTabsContext()
  const setActiveTabId = tabsContext?.setActiveTabId
  const lastAppliedActiveTabId = React.useRef<BuildingInfoTabId | undefined>(
    undefined
  )
  const lastNotifiedActiveTabId = React.useRef<BuildingInfoTabId | undefined>(
    undefined
  )
  const requestedTabId =
    activeTabId == null
      ? undefined
      : resolveEnergymapBuildingInfoTab({
          topology,
          requestedTabId: activeTabId,
        })?.id
  const hasRequestedTab =
    requestedTabId != null &&
    tabsContext?.tabs.some((tab) => tab.tabId === requestedTabId) === true
  const resolvedActiveTabId = tabsContext?.resolvedActiveTabId

  React.useEffect(() => {
    lastAppliedActiveTabId.current = undefined
    lastNotifiedActiveTabId.current = undefined
  }, [topology.signature])

  React.useEffect(() => {
    if (
      requestedTabId == null ||
      !hasRequestedTab ||
      lastAppliedActiveTabId.current === requestedTabId
    ) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setActiveTabId?.(requestedTabId)
      lastAppliedActiveTabId.current = requestedTabId
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [hasRequestedTab, requestedTabId, setActiveTabId, topology.signature])

  React.useEffect(() => {
    if (
      !isBuildingInfoTabId(resolvedActiveTabId) ||
      !topology.availableTabs.some((tab) => tab.id === resolvedActiveTabId) ||
      lastNotifiedActiveTabId.current === resolvedActiveTabId
    ) {
      return
    }

    if (
      requestedTabId != null &&
      resolvedActiveTabId !== requestedTabId &&
      lastAppliedActiveTabId.current !== requestedTabId
    ) {
      return
    }

    lastNotifiedActiveTabId.current = resolvedActiveTabId
    onActiveTabChange?.(resolvedActiveTabId)
  }, [onActiveTabChange, requestedTabId, resolvedActiveTabId, topology])

  return null
}

const TwoPanelIcon = () => (
  <img
    src="/files/img/energiakartta/sidebar/building-info-two-panel.svg"
    alt=""
    aria-hidden="true"
    style={{
      display: 'block',
      width: '26.8px',
      height: '21.8px',
    }}
  />
)

const ThreePanelIcon = () => (
  <Box
    sx={{
      position: 'relative',
      width: '18.75px',
      height: '19.5px',
      overflow: 'visible',
    }}
  >
    <img
      src="/files/img/energiakartta/sidebar/building-info-three-panel-left.svg"
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '8px',
        left: 0,
        display: 'block',
        width: '11.75px',
        height: '14.65px',
      }}
    />
    <img
      src="/files/img/energiakartta/sidebar/building-info-three-panel-right.svg"
      alt=""
      aria-hidden="true"
      style={{
        position: 'absolute',
        top: '1px',
        right: 0,
        display: 'block',
        width: '11.75px',
        height: '14.65px',
      }}
    />
  </Box>
)

const getBuildingInfoPageControlsSx = ({
  forceMobileLayout = false,
  isDesktopFullscreenLayout = false,
}: {
  forceMobileLayout?: boolean
  isDesktopFullscreenLayout?: boolean
}): AppSxProps | undefined => {
  if (forceMobileLayout || !isDesktopFullscreenLayout) {
    return undefined
  }

  return {
    position: 'fixed',
    top: `${MAP_CONTROL_EDGE_GUTTER_PX}px`,
    right: `${MAP_CONTROL_EDGE_GUTTER_PX}px`,
    left: 'auto',
    gap: '4px',
    px: 0,
    py: 0,
    backgroundColor: 'transparent',
    borderBottom: 0,
    zIndex: (theme: AppTheme) => theme.zIndex.drawer + 14,
  }
}

const BuildingInfoProvenanceTrigger = ({
  locale,
  label,
  expanded,
  regionId,
  triggerRef,
  onPointerActivationStart,
  onPointerActivationRelease,
  onPointerActivationCancel,
  onOpen,
}: {
  locale: string
  label: string
  expanded: boolean
  regionId: string
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>
  onPointerActivationStart: () => void
  onPointerActivationRelease: () => void
  onPointerActivationCancel: () => void
  onOpen: () => void
}) => (
  <Button
    ref={triggerRef}
    type="button"
    variant="text"
    size="small"
    color="inherit"
    aria-label={label}
    aria-expanded={expanded}
    aria-controls={regionId}
    data-testid="building-info-provenance-trigger"
    onPointerDown={onPointerActivationStart}
    onPointerUp={onPointerActivationRelease}
    onPointerCancel={onPointerActivationCancel}
    onPointerLeave={(event) => {
      if (event.buttons !== 0) onPointerActivationCancel()
    }}
    onClick={onOpen}
    startIcon={<InfoCircle aria-hidden="true" sx={{ width: 18, height: 18 }} />}
    sx={{ mt: '1.5rem' }}
  >
    <TText
      keyName="sidebar.building_info.provenance.view.action"
      ns="energiakartta"
      language={locale}
    />
  </Button>
)

export const BuildingInfoTabPages = ({
  missingData,
  locale,
  topology,
  ariaLabels,
  activeTabId,
  forceMobileLayout = false,
  isDesktopFullscreenLayout = false,
  onActiveTabChange,
  onClose,
  onCollapse,
}: BuildingInfoTabPagesProps) => {
  const { t } = useTranslate('energiakartta')
  const [provenanceDisclosureState, setProvenanceDisclosureState] =
    React.useState<BuildingInfoProvenanceDisclosureState>('closed')
  const provenanceDisclosureStateRef =
    React.useRef<BuildingInfoProvenanceDisclosureState>('closed')
  const isProvenanceOpen = provenanceDisclosureState === 'open'
  const [effectiveWaterProjection, setEffectiveWaterProjection] =
    React.useState<EnergymapEffectiveWaterProjection>()
  const provenanceTriggerRef = React.useRef<HTMLButtonElement | null>(null)
  const provenanceHeadingRef = React.useRef<HTMLHeadingElement | null>(null)
  const returnFocusFrameRef = React.useRef<number | null>(null)
  const pointerReleaseFrameRef = React.useRef<number | null>(null)
  const generatedProvenanceId = React.useId().replace(/:/g, '')
  const provenanceRegionId = `building-info-provenance-region-${generatedProvenanceId}`
  const provenanceHeadingId = `building-info-provenance-heading-${generatedProvenanceId}`
  const provenanceOpenLabel = t('sidebar.building_info.provenance.view.open', {
    language: locale,
  })
  const effectiveMissingData = React.useMemo(() => {
    if (missingData == null || effectiveWaterProjection == null)
      return missingData
    const items = missingData.items.filter(
      (item) => item.id !== 'energyConsumption.water'
    )
    if (effectiveWaterProjection.calculationResult.status === 'unsupported') {
      const nextOutputIndex = items.findIndex(
        (item) =>
          item.id === 'energyConsumption.cost' ||
          item.id === 'energyConsumption.co2' ||
          item.panelId === 'renovationRecommendations'
      )
      items.splice(nextOutputIndex < 0 ? items.length : nextOutputIndex, 0, {
        id: 'energyConsumption.water',
        panelId: 'energyConsumption',
        label: {
          type: 'translation',
          keyName: 'sidebar.building_info.panels.energy.primary.water',
        },
        reason: {
          type: 'translation',
          keyName: 'sidebar.building_info.missing_data.water_residents',
        },
      })
    }
    return { ...missingData, items }
  }, [effectiveWaterProjection, missingData])
  const handleEffectiveWaterProjectionChange = React.useCallback(
    (projection?: EnergymapEffectiveWaterProjection) => {
      setEffectiveWaterProjection(projection)
    },
    []
  )
  const updateProvenanceDisclosureState = React.useCallback(
    (nextState: BuildingInfoProvenanceDisclosureState) => {
      provenanceDisclosureStateRef.current = nextState
      setProvenanceDisclosureState(nextState)
    },
    []
  )
  const getProvenanceDisclosureState = React.useCallback(
    () => provenanceDisclosureStateRef.current,
    []
  )
  const effectiveWaterProjectionContextValue = React.useMemo(
    () => ({
      onProjectionChange: handleEffectiveWaterProjectionChange,
      provenanceDisclosureState,
      getProvenanceDisclosureState,
    }),
    [
      getProvenanceDisclosureState,
      handleEffectiveWaterProjectionChange,
      provenanceDisclosureState,
    ]
  )
  const cancelPendingPointerRelease = React.useCallback(() => {
    if (pointerReleaseFrameRef.current == null) {
      return
    }

    window.cancelAnimationFrame(pointerReleaseFrameRef.current)
    pointerReleaseFrameRef.current = null
  }, [])
  const handleProvenancePointerActivationStart = React.useCallback(() => {
    if (provenanceDisclosureStateRef.current !== 'closed') {
      return
    }

    cancelPendingPointerRelease()
    updateProvenanceDisclosureState('pointerPending')
  }, [cancelPendingPointerRelease, updateProvenanceDisclosureState])
  const handleProvenancePointerActivationRelease = React.useCallback(() => {
    if (provenanceDisclosureStateRef.current !== 'pointerPending') {
      return
    }

    cancelPendingPointerRelease()
    pointerReleaseFrameRef.current = window.requestAnimationFrame(() => {
      pointerReleaseFrameRef.current = null
      if (provenanceDisclosureStateRef.current === 'pointerPending') {
        updateProvenanceDisclosureState('closed')
      }
    })
  }, [cancelPendingPointerRelease, updateProvenanceDisclosureState])
  const handleProvenancePointerActivationCancel = React.useCallback(() => {
    if (provenanceDisclosureStateRef.current !== 'pointerPending') {
      return
    }

    cancelPendingPointerRelease()
    updateProvenanceDisclosureState('closed')
  }, [cancelPendingPointerRelease, updateProvenanceDisclosureState])
  const handleOpenProvenance = React.useCallback(() => {
    cancelPendingPointerRelease()
    if (returnFocusFrameRef.current != null) {
      window.cancelAnimationFrame(returnFocusFrameRef.current)
      returnFocusFrameRef.current = null
    }
    updateProvenanceDisclosureState('open')
  }, [cancelPendingPointerRelease, updateProvenanceDisclosureState])
  const handleCloseProvenance = React.useCallback(() => {
    cancelPendingPointerRelease()
    updateProvenanceDisclosureState('closed')

    if (returnFocusFrameRef.current != null) {
      window.cancelAnimationFrame(returnFocusFrameRef.current)
    }
    returnFocusFrameRef.current = window.requestAnimationFrame(() => {
      returnFocusFrameRef.current = null
      if (provenanceTriggerRef.current?.isConnected) {
        provenanceTriggerRef.current.focus()
      }
    })
  }, [cancelPendingPointerRelease, updateProvenanceDisclosureState])

  React.useEffect(() => {
    if (!isProvenanceOpen) {
      return undefined
    }

    const frameId = window.requestAnimationFrame(() => {
      provenanceHeadingRef.current?.focus()
    })

    return () => {
      window.cancelAnimationFrame(frameId)
    }
  }, [isProvenanceOpen])

  React.useEffect(() => {
    if (!isProvenanceOpen) {
      return undefined
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return
      }

      event.preventDefault()
      handleCloseProvenance()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleCloseProvenance, isProvenanceOpen])

  React.useEffect(
    () => () => {
      if (returnFocusFrameRef.current != null) {
        window.cancelAnimationFrame(returnFocusFrameRef.current)
      }
      if (pointerReleaseFrameRef.current != null) {
        window.cancelAnimationFrame(pointerReleaseFrameRef.current)
      }
    },
    []
  )

  if (topology.availableTabs.length === 0) {
    return null
  }

  return (
    <BuildingInfoEffectiveWaterProjectionContext.Provider
      value={effectiveWaterProjectionContextValue}
    >
      <BuildingInfoActiveTabSync
        activeTabId={activeTabId}
        topology={topology}
        onActiveTabChange={onActiveTabChange}
      />
      {topology.availableTabs.map((tab) => {
        const isBasicTab = tab.id === 'basic'
        const tabLabel = isBasicTab
          ? ariaLabels.overview
          : ariaLabels.renovation

        return (
          <SidebarPanelExtensionTabContainer
            key={tab.id}
            tabId={tab.id}
            tabName={tabLabel}
            tabAriaLabel={tabLabel}
            tabIcon={isBasicTab ? <TwoPanelIcon /> : <ThreePanelIcon />}
          >
            <SidebarPanelExtensionPageContainer
              closeAriaLabel={ariaLabels.close}
              collapseAriaLabel={ariaLabels.collapse}
              onClose={onClose}
              onCollapse={() => onCollapse(tab.id)}
              contentSx={{
                backgroundColor: '#f9f9f9',
              }}
              controlsSx={getBuildingInfoPageControlsSx({
                forceMobileLayout,
                isDesktopFullscreenLayout,
              })}
            >
              <Box
                hidden={isProvenanceOpen}
                sx={{ display: isProvenanceOpen ? 'none' : 'contents' }}
              >
                <BuildingInfoTabPageContent
                  detailsFooter={
                    <BuildingInfoProvenanceTrigger
                      locale={locale}
                      label={provenanceOpenLabel}
                      expanded={isProvenanceOpen}
                      regionId={provenanceRegionId}
                      triggerRef={provenanceTriggerRef}
                      onPointerActivationStart={
                        handleProvenancePointerActivationStart
                      }
                      onPointerActivationRelease={
                        handleProvenancePointerActivationRelease
                      }
                      onPointerActivationCancel={
                        handleProvenancePointerActivationCancel
                      }
                      onOpen={handleOpenProvenance}
                    />
                  }
                  tab={tab}
                  forceMobileLayout={forceMobileLayout}
                />
              </Box>
              <Box
                hidden={!isProvenanceOpen}
                sx={{ display: isProvenanceOpen ? 'contents' : 'none' }}
              >
                <BuildingInfoProvenanceView
                  missingData={effectiveMissingData}
                  locale={locale}
                  regionId={provenanceRegionId}
                  headingId={provenanceHeadingId}
                  headingRef={provenanceHeadingRef}
                  forceMobileLayout={forceMobileLayout}
                  onClose={handleCloseProvenance}
                />
              </Box>
            </SidebarPanelExtensionPageContainer>
          </SidebarPanelExtensionTabContainer>
        )
      })}
    </BuildingInfoEffectiveWaterProjectionContext.Provider>
  )
}

export const BuildingInfoActionRail = ({
  activeMode,
  availableModes,
  isCollapsed,
  orientation = 'column',
  ariaLabels,
  onModeChange,
}: BuildingInfoActionRailProps) => {
  const tooltipSide: BuildingInfoTooltipSide =
    orientation === 'row' ? 'top' : 'right'

  if (availableModes.length === 0) {
    return null
  }

  const actions: Record<
    BuildingInfoDesktopMode,
    { label: string; icon: React.ReactNode }
  > = {
    twoPanel: {
      label: ariaLabels.overview,
      icon: <TwoPanelIcon />,
    },
    threePanel: {
      label: ariaLabels.renovation,
      icon: <ThreePanelIcon />,
    },
  }

  return (
    <Box
      data-testid="building-info-action-rail"
      data-orientation={orientation}
      sx={{
        display: 'flex',
        flexDirection: orientation,
        gap: `${BUILDING_INFO_ACTION_BUTTON_GAP_PX}px`,
        pointerEvents: 'auto',
      }}
    >
      {availableModes.map((mode) => {
        const action = actions[mode]
        const active = activeMode === mode && !isCollapsed

        return (
          <BuildingInfoTooltip
            key={mode}
            title={action.label}
            side={tooltipSide}
          >
            {(triggerProps) => (
              <IconButton
                {...triggerProps}
                type="button"
                aria-label={action.label}
                aria-pressed={active}
                data-building-info-mode={mode}
                onClick={() => onModeChange(mode)}
                size="small"
                sx={actionButtonSx({ active })}
              >
                {action.icon}
              </IconButton>
            )}
          </BuildingInfoTooltip>
        )
      })}
    </Box>
  )
}
