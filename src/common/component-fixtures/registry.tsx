import { actionIconTextHelpersFixture } from './fixtures/ActionIconTextHelpersFixture'
import { buttonPrimitivesFixture } from './fixtures/ButtonPrimitivesFixture'
import { booleanControlsFixture } from './fixtures/BooleanControlsFixture'
import { colorPickerWithPopoverFixture } from './fixtures/ColorPickerWithPopoverFixture'
import { dropDownMultiSelectFixture } from './fixtures/DropDownMultiSelectFixture'
import { dropDownSelectFixture } from './fixtures/DropDownSelectFixture'
import { flowStepPrimitivesFixture } from './fixtures/FlowStepPrimitivesFixture'
import { folderFixture } from './fixtures/FolderFixture'
import { fullscreenPageFixture } from './fixtures/FullscreenPageFixture'
import { loadingFeedbackFixture } from './fixtures/LoadingFeedbackFixture'
import { luonnonmetsakartatAreaModalFixture } from './fixtures/LuonnonmetsakartatAreaModalFixture'
import { luonnonmetsakartatAdminPicturesAreaModalFixture } from './fixtures/LuonnonmetsakartatAdminPicturesAreaModalFixture'
import { luonnonmetsakartatFolayerImportControlsFixture } from './fixtures/LuonnonmetsakartatFolayerImportControlsFixture'
import { luonnonmetsakartatSearchTableFixture } from './fixtures/LuonnonmetsakartatSearchTableFixture'
import { mainPopupTableFixture } from './fixtures/MainPopupTableFixture'
import { layerToggleRowFixture } from './fixtures/LayerToggleRowFixture'
import {
  mapButtonGroupsFixture,
  mapLayerMenuFixture,
  mapUserButtonsFixture,
} from './fixtures/MapLayerToolbarChromeFixture'
import { mapButtonPrimitivesFixture } from './fixtures/MapButtonPrimitivesFixture'
import { mapSearchBarFixture } from './fixtures/MapSearchBarFixture'
import { multiSelectAutocompleteFixture } from './fixtures/MultiSelectAutocompleteFixture'
import { notificationFeedbackFixture } from './fixtures/NotificationFeedbackFixture'
import { editableTextFixture } from './fixtures/EditableTextFixture'
import {
  energymapBackgroundFiltersFixture,
  energymapEnergyClassControlsFixture,
} from './fixtures/EnergymapFrontPageControlsFixture'
import { energymapBuildingInfoPanelFixture } from './fixtures/EnergymapBuildingInfoPanelFixture'
import { energymapVentilationControlsFixture } from './fixtures/EnergymapVentilationControlsFixture'
import { hiilikarttaDisplayPrimitivesFixture } from './fixtures/HiilikarttaDisplayPrimitivesFixture'
import { hiilikarttaPlanImportControlsFixture } from './fixtures/HiilikarttaPlanImportControlsFixture'
import { hiilikarttaPlanReportActionsFixture } from './fixtures/HiilikarttaPlanReportActionsFixture'
import { hiilikarttaZoneAreaControlsFixture } from './fixtures/HiilikarttaZoneAreaControlsFixture'
import { hiilikarttaZoneAccordionItemFixture } from './fixtures/HiilikarttaZoneAccordionItemFixture'
import { hiilikarttaCarbonLineChartFixture } from './fixtures/HiilikarttaCarbonLineChartFixture'
import { hiilikarttaCarbonMapGraphFixture } from './fixtures/HiilikarttaCarbonMapGraphFixture'
import { hiilikarttaReportOverviewFixture } from './fixtures/HiilikarttaReportOverviewFixture'
import { numberInputFieldFixture } from './fixtures/NumberInputFieldFixture'
import { sharedSvgIconFixture } from './fixtures/SharedSvgIconFixture'
import { sharedModalOverlaysFixture } from './fixtures/SharedModalOverlaysFixture'
import { sidebarPanelExtensionChromeFixture } from './fixtures/SidebarPanelExtensionChromeFixture'
import {
  textFieldMultilineWithLabelFixture,
  textFieldWithLabelFixture,
} from './fixtures/TextFieldControlsFixture'
import { sidebarBackgroundContentFixture } from './fixtures/SidebarBackgroundContentFixture'
import type { ComponentFixture, ComponentFixtureStateLookup } from './types'

const componentFixtures: ComponentFixture[] = [
  sharedSvgIconFixture,
  mapButtonPrimitivesFixture,
  mapButtonGroupsFixture,
  mapUserButtonsFixture,
  mapLayerMenuFixture,
  mapSearchBarFixture,
  layerToggleRowFixture,
  luonnonmetsakartatAreaModalFixture,
  luonnonmetsakartatAdminPicturesAreaModalFixture,
  luonnonmetsakartatFolayerImportControlsFixture,
  luonnonmetsakartatSearchTableFixture,
  energymapEnergyClassControlsFixture,
  energymapBackgroundFiltersFixture,
  energymapBuildingInfoPanelFixture,
  hiilikarttaDisplayPrimitivesFixture,
  hiilikarttaPlanImportControlsFixture,
  hiilikarttaPlanReportActionsFixture,
  hiilikarttaZoneAreaControlsFixture,
  hiilikarttaZoneAccordionItemFixture,
  hiilikarttaCarbonLineChartFixture,
  hiilikarttaCarbonMapGraphFixture,
  hiilikarttaReportOverviewFixture,
  mainPopupTableFixture,
  dropDownSelectFixture,
  dropDownMultiSelectFixture,
  multiSelectAutocompleteFixture,
  numberInputFieldFixture,
  editableTextFixture,
  buttonPrimitivesFixture,
  booleanControlsFixture,
  flowStepPrimitivesFixture,
  colorPickerWithPopoverFixture,
  actionIconTextHelpersFixture,
  sidebarBackgroundContentFixture,
  sidebarPanelExtensionChromeFixture,
  folderFixture,
  fullscreenPageFixture,
  textFieldWithLabelFixture,
  textFieldMultilineWithLabelFixture,
  loadingFeedbackFixture,
  sharedModalOverlaysFixture,
  notificationFeedbackFixture,
  energymapVentilationControlsFixture,
]

export const getComponentFixtures = () => componentFixtures

export const getComponentFixture = (
  fixtureId: string
): ComponentFixture | undefined =>
  componentFixtures.find((fixture) => fixture.id === fixtureId)

export const getComponentFixtureState = ({
  fixtureId,
  stateId,
}: {
  fixtureId: string
  stateId: string
}): ComponentFixtureStateLookup | undefined => {
  const fixture = getComponentFixture(fixtureId)
  const state = fixture?.states.find((candidate) => candidate.id === stateId)

  if (!fixture || !state) {
    return undefined
  }

  return { fixture, state }
}
