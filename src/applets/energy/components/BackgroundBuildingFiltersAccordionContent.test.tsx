import React from 'react'
import '@testing-library/jest-dom'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'

import { AppThemeProvider } from '#/common/style/theme'
import { ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE } from '../layers/buildingPolygonsLayerConf'
import { useAppletStore } from '../state/appletStore'
import BackgroundBuildingFiltersAccordionContent from './BackgroundBuildingFiltersAccordionContent'

jest.mock('@tolgee/react', () => {
  const translations: Record<string, string> = {
    'sidebar.background_filters.building_types.all': 'All buildings',
    'sidebar.background_filters.building_types.01': 'Residential',
    'sidebar.background_filters.building_types.02': 'Free-time residential',
    'sidebar.background_filters.building_types.03': 'Commercial',
    'sidebar.background_filters.building_types.04': 'Office',
    'sidebar.background_filters.building_types.05': 'Traffic',
    'sidebar.background_filters.building_types.06': 'Care',
    'sidebar.background_filters.building_types.07': 'Assembly',
    'sidebar.background_filters.building_types.label': 'Building type',
    'sidebar.background_filters.building_types.aria_label':
      'Building type filter',
    'sidebar.background_filters.construction_year.any': 'Any year',
    'sidebar.background_filters.construction_year.label': 'Construction year',
    'sidebar.background_filters.construction_year.aria_label':
      'Construction year filter',
    'sidebar.background_filters.construction_year.show_from_decade':
      'Show from decade',
    'sidebar.background_filters.construction_year.show_only_decade':
      'Show only decade',
  }

  return {
    T: ({ keyName }: { keyName: string }) => keyName,
    useTranslate: () => ({
      t: (key: string) => translations[key] ?? key,
    }),
  }
})

const getConstructionYearSelect = () =>
  screen.getByRole('combobox', { name: 'Construction year filter' })

const renderWithAppProvider = (ui: React.ReactElement) => {
  return render(
    <AppThemeProvider disableCssBaseline>{ui}</AppThemeProvider>
  )
}

describe('BackgroundBuildingFiltersAccordionContent', () => {
  const originalGetBoundingClientRect =
    HTMLElement.prototype.getBoundingClientRect

  beforeAll(() => {
    HTMLElement.prototype.getBoundingClientRect = () =>
      ({
        bottom: 20,
        height: 20,
        left: 0,
        right: 100,
        top: 0,
        width: 100,
        x: 0,
        y: 0,
        toJSON: () => {},
      }) as DOMRect
  })

  afterAll(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect
  })

  beforeEach(() => {
    useAppletStore.getState().resetBuildingFilters()
  })

  it('uses shared negative-margin geometry while preserving year-label clearance', () => {
    const { container } = renderWithAppProvider(
      <BackgroundBuildingFiltersAccordionContent />
    )
    const constructionYearSelect = getConstructionYearSelect()
    const constructionYearRow = container.querySelector<HTMLElement>(
      '[data-slot="inset-select-root"]'
    )!

    expect(
      screen.getByRole('combobox', { name: 'Building type filter' })
    ).toHaveStyle({
      marginLeft: '-1rem',
      marginRight: '-1rem',
      width: 'calc(100% + 2rem)',
    })
    expect(constructionYearSelect).toHaveStyle({
      marginLeft: '-1.125rem',
      marginRight: '-1rem',
      width: 'calc(100% + 2.125rem)',
    })
    expect(constructionYearRow).toHaveStyle({ gap: '1.875rem' })
  })

  it('renders Any year as the default and first construction-year option', async () => {
    renderWithAppProvider(<BackgroundBuildingFiltersAccordionContent />)

    const constructionYearSelect = getConstructionYearSelect()

    expect(constructionYearSelect).toHaveTextContent('Any year')
    expect(
      screen.getByRole('switch', { name: 'Show from decade' })
    ).toBeDisabled()
    expect(
      screen.getByRole('switch', { name: 'Show only decade' })
    ).toBeDisabled()

    fireEvent.click(constructionYearSelect)

    const listbox = await screen.findByRole('listbox')
    const options = within(listbox).getAllByRole('option')

    expect(options[0]).toHaveTextContent('Any year')
    expect(options[1]).toHaveTextContent('1900 - 1909')
  })

  it('keeps the construction-year switches exclusive in rendered state and store state', () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)

    renderWithAppProvider(<BackgroundBuildingFiltersAccordionContent />)

    const showFromSwitch = screen.getByRole('switch', {
      name: 'Show from decade',
    })
    const showOnlySwitch = screen.getByRole('switch', {
      name: 'Show only decade',
    })

    expect(showFromSwitch).not.toBeDisabled()
    expect(showOnlySwitch).not.toBeDisabled()

    fireEvent.click(showFromSwitch)

    expect(showFromSwitch).toBeChecked()
    expect(showOnlySwitch).not.toBeChecked()
    expect(useAppletStore.getState().showBuildingsFromSelectedDecade).toBe(
      true
    )
    expect(useAppletStore.getState().showOnlySelectedDecade).toBe(false)

    fireEvent.click(showOnlySwitch)

    expect(showFromSwitch).not.toBeChecked()
    expect(showOnlySwitch).toBeChecked()
    expect(useAppletStore.getState().showBuildingsFromSelectedDecade).toBe(
      false
    )
    expect(useAppletStore.getState().showOnlySelectedDecade).toBe(true)

    fireEvent.click(showOnlySwitch)

    expect(showFromSwitch).not.toBeChecked()
    expect(showOnlySwitch).not.toBeChecked()
    expect(useAppletStore.getState().showBuildingsFromSelectedDecade).toBe(
      false
    )
    expect(useAppletStore.getState().showOnlySelectedDecade).toBe(false)
  })

  it('clears construction-year switches when Any year is selected', async () => {
    useAppletStore.getState().setSelectedConstructionDecade(1970)
    useAppletStore.getState().setShowOnlySelectedDecade(true)

    renderWithAppProvider(<BackgroundBuildingFiltersAccordionContent />)

    const constructionYearSelect = getConstructionYearSelect()
    const showFromSwitch = screen.getByRole('switch', {
      name: 'Show from decade',
    })
    const showOnlySwitch = screen.getByRole('switch', {
      name: 'Show only decade',
    })

    expect(showOnlySwitch).toBeChecked()

    fireEvent.click(constructionYearSelect)
    const anyYearOption = await screen.findByRole('option', { name: 'Any year' })
    fireEvent.mouseMove(anyYearOption)
    await waitFor(() => {
      expect(anyYearOption.hasAttribute('data-highlighted')).toBe(true)
    })
    fireEvent.click(anyYearOption)

    await waitFor(() => {
      expect(constructionYearSelect).toHaveTextContent('Any year')
    })
    expect(showFromSwitch).not.toBeChecked()
    expect(showOnlySwitch).not.toBeChecked()
    expect(showFromSwitch).toBeDisabled()
    expect(showOnlySwitch).toBeDisabled()
    expect(useAppletStore.getState().selectedConstructionDecade).toBe(
      ENERGYMAP_DEFAULT_SELECTED_CONSTRUCTION_DECADE
    )
  })
it('disables all background filters in areas without changing their retained values', () => {
  useAppletStore.setState({ effectiveGeography: 'buildings' })
  useAppletStore.getState().setBuildingTypeFilter('01')
  useAppletStore.getState().setSelectedConstructionDecade(1980)
  useAppletStore.getState().setShowOnlySelectedDecade(true)
  renderWithAppProvider(<BackgroundBuildingFiltersAccordionContent />)
  act(() => useAppletStore.setState({ effectiveGeography: 'postal_code' }))
  for (const select of screen.getAllByRole('combobox')) expect(select).toBeDisabled()
  for (const control of screen.getAllByRole('switch')) expect(control).toBeDisabled()
  fireEvent.click(screen.getAllByRole('switch')[0])
  expect(useAppletStore.getState().showOnlySelectedDecade).toBe(true)
  act(() => useAppletStore.setState({ effectiveGeography: 'buildings' }))
  for (const select of screen.getAllByRole('combobox')) expect(select).not.toBeDisabled()
  expect(useAppletStore.getState().buildingTypeFilter).toBe('01')
  expect(useAppletStore.getState().selectedConstructionDecade).toBe(1980)
})

})
