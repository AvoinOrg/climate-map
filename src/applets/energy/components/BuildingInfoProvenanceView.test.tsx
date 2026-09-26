import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { AppThemeProvider } from '#/common/style/theme'
import type { EnergymapBuildingInfoMissingData } from 'applets/energy/common/buildingInfo'
import { BuildingInfoProvenanceView } from './BuildingInfoProvenanceView'

jest.mock('@tolgee/react', () => {
  const ReactRuntime = jest.requireActual<typeof import('react')>('react')
  return {
    T: ({ keyName, language }: { keyName: string; language?: string }) =>
      ReactRuntime.createElement('span', { lang: language }, keyName),
  }
})
const missingData: EnergymapBuildingInfoMissingData = {
  locale: 'en',
  items: [
    {
      id: 'buildingDetails.address',
      panelId: 'buildingDetails',
      evidence: {
        source: 'ryhtiBuildingData',
        field: 'address',
        kind: 'legacy-cause-unestablished',
        code: 'legacy',
        evidence: 'published-field',
      },
      label: {
        type: 'translation',
        keyName: 'sidebar.building_info.panels.building.rows.address',
      },
      reason: {
        type: 'translation',
        keyName: 'sidebar.building_info.missing_reason.fields.address.legacy',
      },
    },
    {
      id: 'buildingDetails.energyClass',
      panelId: 'buildingDetails',
      label: { type: 'plain', text: 'Energy class' },
      reason: {
        type: 'translation',
        keyName: 'sidebar.building_info.missing_reason.causes.official-class',
      },
      evidence: {
        source: 'energyCertificateRegister',
        field: 'energyClass',
        kind: 'legacy-cause-unestablished',
        code: 'official-class',
        evidence: 'published-field',
      },
    },
    {
      id: 'energyConsumption.heating.annualTotal',
      panelId: 'energyConsumption',
      reason: {
        type: 'translation',
        keyName: 'sidebar.building_info.missing_reason.causes.annual',
      },
      evidence: {
        source: 'energyMapConsumptionModel',
        field: 'heating.annualTotal',
        kind: 'incomplete-calculation',
        code: 'annual',
        evidence: 'calculation',
      },
      label: {
        type: 'sequence',
        separator: ' — ',
        parts: [
          { type: 'plain', text: 'Heating' },
          { type: 'plain', text: 'Annual consumption' },
        ],
      },
    },
  ],
}
const element = (
  data: EnergymapBuildingInfoMissingData | null,
  onClose = jest.fn(),
  locale = 'en'
) => (
  <AppThemeProvider disableCssBaseline>
    <BuildingInfoProvenanceView
      missingData={data}
      locale={locale}
      regionId="information-region"
      headingId="information-heading"
      headingRef={null}
      onClose={onClose}
    />
  </AppThemeProvider>
)

it('renders a flat missing-only list with a required reason beneath every label', () => {
  const onClose = jest.fn()
  render(element(missingData, onClose))
  const region = screen.getByRole('region', {
    name: 'sidebar.building_info.provenance.view.heading',
  })
  const list = within(region).getByRole('list')
  const items = within(list).getAllByRole('listitem')
  expect(items).toHaveLength(3)
  expect(items[0].querySelector('p')).toHaveTextContent(
    'sidebar.building_info.missing_reason.fields.address.legacy'
  )
  expect(items[0].firstElementChild).toHaveTextContent(
    'sidebar.building_info.panels.building.rows.address'
  )
  expect(items[1].querySelector('p')).toHaveTextContent(
    'sidebar.building_info.missing_reason.causes.official-class'
  )
  expect(items.every((item) => item.querySelector('p')?.textContent)).toBe(true)
  expect(items[2]).toHaveTextContent('Heating — Annual consumption')
  expect(region.querySelector('dl')).toBeNull()
  expect(region.textContent).not.toMatch(
    /provenance\.(inputs|sources|providers|calculations)|buildingDetails\./
  )
  fireEvent.click(
    within(region).getByRole('button', {
      name: 'sidebar.building_info.provenance.view.close',
    })
  )
  expect(onClose).toHaveBeenCalledTimes(1)
})

it.each([
  [{ locale: 'en', items: [] }, 'empty'],
  [null, 'unavailable'],
] as const)(
  'distinguishes empty results from absent diagnostic input (%s)',
  (data, state) => {
    render(element(data as EnergymapBuildingInfoMissingData | null))
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      `sidebar.building_info.missing_data.${state}`
    )
  }
)

it('refreshes labels and reasons with the requested locale and replaces old entries', () => {
  const view = render(element(missingData))
  view.rerender(
    element({ locale: 'fi', items: [missingData.items[0]] }, jest.fn(), 'fi')
  )
  expect(
    screen.getByText(
      'sidebar.building_info.missing_reason.fields.address.legacy'
    )
  ).toHaveAttribute('lang', 'fi')
  expect(screen.queryByText('Energy class')).not.toBeInTheDocument()
  expect(screen.getByTestId('building-info-provenance-view')).toHaveAttribute(
    'data-missing-data-locale',
    'fi'
  )
})
