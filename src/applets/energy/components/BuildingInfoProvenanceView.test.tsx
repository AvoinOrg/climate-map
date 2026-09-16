import React from 'react'
import '@testing-library/jest-dom'
import { fireEvent, render, screen, within } from '@testing-library/react'

import { AppThemeProvider } from '#/common/style/theme'
import {
  createEnergymapBuildingInfoPanels,
  type EnergymapBuildingInfoPanel,
} from '../common/buildingInfo'
import {
  deriveEnergymapBuildingInfoProvenanceSummary,
  type EnergymapBuildingInfoProvenanceSummaryResult,
} from '../common/buildingInfoProvenanceSummary'
import type { EnergymapSelectedBuilding } from '../common/types'
import { BuildingInfoProvenanceView } from './BuildingInfoProvenanceView'

jest.mock('@tolgee/react', () => {
  const ReactRuntime = jest.requireActual<typeof import('react')>('react')

  return {
    T: ({ keyName }: { keyName: string }) =>
      ReactRuntime.createElement('span', null, keyName),
  }
})

const completeProperties = {
  building_key: 'complete-provenance-view',
  permanent_building_identifier: '101614422K',
  address_fin: 'Mikkolantie 34a',
  postal_code: '00640',
  postal_office_fin: 'HELSINKI',
  main_purpose: '05',
  completion_date: '1967-01-01',
  heating_method: '01',
  heating_energy_source: '01',
  floor_area: 454,
  total_area: 470,
  gross_floor_area: 500,
  number_of_storeys: 2,
  energy_class: 'D',
  is_energy_class_modeled: false,
  energy_certificate_valid_until: '2031-12-31 00:00:00.0',
  energy_certificate_previous_class: 'E',
  energy_certificate_heated_net_area: 1355,
  energy_certificate_ventilation_description_sv: 'Självdrag.',
  energy_certificate_recommendations_fi: 'Tiivistä yläpohjan lämmöneristystä.',
  distr_default_total: 367.7884615,
  distr_default_heat: 343.6634615,
  distr_default_elec: 24.125,
  distr_aahp_total: 289.7019231,
  distr_solar_total: 334.2980769,
  distr_windows_total: 332.6442308,
} satisfies EnergymapSelectedBuilding['properties']

const createCertificateViewProperties = ({
  completeness = 'complete',
  heatedArea = 22707.2,
}: {
  completeness?: 'complete' | 'partial'
  heatedArea?: number | null
} = {}): EnergymapSelectedBuilding['properties'] => ({
  building_key: '1036581819',
  permanent_building_identifier: '1036581819',
  floor_area: 0,
  energy_class: 'C',
  is_energy_class_modeled: false,
  energy_certificate_valid_until: '2033-04-14T00:00:00',
  energy_certificate_heated_net_area: 22707.2,
  energy_certificate_consumption: JSON.stringify({
    basis: 'standardized_calculation',
    building_identifier: '1036581819',
    certificate_id: '318510',
    certificate_version: 2018,
    completeness,
    components: [
      { annual_kwh: 1196074, carrier: 'electricity' },
      { annual_kwh: 2994881, carrier: 'district_heat' },
      { annual_kwh: 197293, carrier: 'district_cooling' },
      { annual_kwh: 0, carrier: 'fossil_fuel' },
      { annual_kwh: 0, carrier: 'renewable_fuel' },
    ],
    ...(heatedArea == null ? {} : { heated_net_area_m2: heatedArea }),
    schema_version: 1,
    signed_at: '2023-04-13T11:37:42.080327',
    total_kwh_year: completeness === 'complete' ? 4388248 : null,
    unit: 'kWh/year',
    valid_until: '2033-04-14T00:00:00',
  }),
})

const createPanels = ({
  properties = completeProperties,
  locale = 'en',
}: {
  properties?: EnergymapSelectedBuilding['properties']
  locale?: string
} = {}): EnergymapBuildingInfoPanel[] => {
  const buildingKey = String(properties.building_key)
  const panels = createEnergymapBuildingInfoPanels({
    selectedBuilding: {
      id: buildingKey,
      buildingKey,
      source: 'energymap_building_polygons',
      sourceLayer: 'energymap_building_polygons',
      layerId: 'energymap_building_polygons-fill',
      properties,
    },
    locale,
  })

  if (panels == null) {
    throw new Error('Expected building-info panels')
  }

  return panels
}

const deriveResult = ({
  properties,
  locale = 'en',
}: {
  properties?: EnergymapSelectedBuilding['properties']
  locale?: string
} = {}) => {
  const panels = createPanels({ properties, locale })
  const result = deriveEnergymapBuildingInfoProvenanceSummary({
    panels,
    locale,
  })

  if (result == null) {
    throw new Error('Expected provenance result')
  }

  return result
}

const renderView = ({
  result,
  onClose = jest.fn(),
}: {
  result: EnergymapBuildingInfoProvenanceSummaryResult
  onClose?: () => void
}) => {
  const headingRef = React.createRef<HTMLHeadingElement>()
  const view = render(
    <AppThemeProvider disableCssBaseline>
      <BuildingInfoProvenanceView
        result={result}
        regionId="provenance-region"
        headingId="provenance-heading"
        headingRef={headingRef}
        onClose={onClose}
      />
    </AppThemeProvider>
  )

  return { ...view, headingRef }
}

describe('BuildingInfoProvenanceView', () => {
  it('shows separate ventilation origins, runtime evidence and certificate/language context', () => {
    renderView({
      result: deriveResult({
        properties: {
          energy_certificate_ventilation_type_id: '0',
          energy_certificate_ventilation_type_label_fi: 'Synthetic FI label',
          energy_certificate_ventilation_description_sv:
            'Synthetic SV description',
          ventilation_category: 'other',
        },
      }),
    })
    const items = screen.getAllByTestId('building-info-provenance-item')
    expect(items).toHaveLength(3)
    const item = (rowId: string) =>
      items.find(
        (element) =>
          element.getAttribute('data-provenance-item-id') ===
          `buildingDetails/technicalDetails/row/${rowId}`
      )!
    const type = item('ventilationType')
    for (const key of [
      'fields.ventilation_type',
      'categories.official_classification',
      'sources.official_ventilation_classification',
      'sources.energy_certificate_register',
      'inputs.certificate_ventilation_code',
      'metadata.ventilation_certificate_context',
      'metadata.ventilation_source_language',
    ]) {
      expect(type).toHaveTextContent(`sidebar.building_info.provenance.${key}`)
    }
    expect(within(type).getByText('0', { exact: false })).toBeInTheDocument()
    expect(item('ventilation')).toHaveTextContent(
      'sidebar.building_info.provenance.sources.energy_certificate_register'
    )
    const category = item('ventilationCategory')
    expect(category).toHaveTextContent(
      'sidebar.building_info.provenance.sources.energy_map_ventilation_grouping'
    )
    expect(category).toHaveTextContent(
      'sidebar.building_info.provenance.categories.published_derivation'
    )
    expect(category).toHaveTextContent(
      'sidebar.building_info.provenance.providers.energy_map'
    )
    expect(category).toHaveTextContent('other')
    expect(category).not.toHaveTextContent(
      'sidebar.building_info.provenance.sources.energy_certificate_register'
    )
    expect(category).not.toHaveTextContent(
      'sidebar.building_info.provenance.categories.modeled_output'
    )
  })

  it.each(['fi', 'en'])(
    'renders property-specific Ryhti evidence only when available (%s)',
    (locale) => {
      const result = deriveResult({
        properties: { property_identifier: '09102000040003' },
        locale,
      })
      const view = renderView({ result })
      const item = screen.getByTestId('building-info-provenance-item')
      expect(item).toHaveAttribute(
        'data-provenance-item-id',
        'buildingDetails/identity/row/propertyIdentifier'
      )
      for (const key of [
        'fields.property_identifier',
        'inputs.property_identifier',
        'categories.building_registry',
        'sources.ryhti_building_data',
        'providers.ryhti',
      ]) {
        expect(item).toHaveTextContent(
          `sidebar.building_info.provenance.${key}`
        )
      }
      view.unmount()
      renderView({
        result: deriveResult({
          properties: {
            permanent_building_identifier: '101614422K',
            property_identifier: '00000000000000',
          },
          locale,
        }),
      })
      const region = screen.getByTestId('building-info-provenance-view')
      expect(
        within(region).queryByText(
          'sidebar.building_info.provenance.fields.property_identifier'
        )
      ).not.toBeInTheDocument()
      expect(
        within(region).queryByText(
          'sidebar.building_info.provenance.inputs.property_identifier'
        )
      ).not.toBeInTheDocument()
      expect(region).toHaveTextContent(
        'sidebar.building_info.provenance.sources.ryhti_building_data'
      )
    }
  )

  it('renders every resolved item in read-model order with returned relationships', () => {
    const result = deriveResult()
    if (result.status !== 'resolved') {
      throw new Error('Expected resolved provenance')
    }

    renderView({ result })

    expect(
      screen
        .getAllByTestId('building-info-provenance-item')
        .map((item) => item.getAttribute('data-provenance-item-id'))
    ).toEqual(result.summary.items.map(({ id }) => id))
    expect(screen.getByTestId('building-info-provenance-view')).toHaveAttribute(
      'data-summary-locale',
      'en'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent('sidebar.building_info.provenance.view.category')
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent('sidebar.building_info.provenance.view.direct_sources')
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.view.supporting_sources'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.view.direct_providers'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.view.supporting_providers'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.view.direct_calculations'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.view.selected_evidence'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent('sidebar.building_info.provenance.view.metadata')
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.source_language: sv'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.reference_version:'
    )
  })

  it('renders the exact certificate summary with public-register metadata and same-certificate area derivations', () => {
    const result = deriveResult({
      properties: createCertificateViewProperties(),
      locale: 'en-US',
    })
    if (result.status !== 'resolved') {
      throw new Error('Expected resolved certificate provenance')
    }

    renderView({ result })

    const view = screen.getByTestId('building-info-provenance-view')
    const renderedItemIds = screen
      .getAllByTestId('building-info-provenance-item')
      .map((item) => item.getAttribute('data-provenance-item-id'))
    const certificateItemIds = result.summary.items
      .filter(({ location }) => location.sectionId === 'certificateConsumption')
      .map(({ id }) => id)

    expect(renderedItemIds).toEqual(result.summary.items.map(({ id }) => id))
    expect(certificateItemIds).toContain(
      'energyConsumption/certificateConsumption/metric/certificateTotal/value/annualTotal'
    )
    expect(certificateItemIds).toContain(
      'energyConsumption/certificateConsumption/metric/certificateTotal/value/perSquareMeter/note'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.sources.energy_certificate_register'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.providers.energy_certificate_register'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.calculations.certificate_annual_divided_by_heated_area'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.certificate_id: 318510'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.certificate_version: 2018'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.certificate_signed_at: 4/13/2023'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.certificate_valid_until: 4/14/2033'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.certificate_annual_unit: kWh/year'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.certificate_heated_area: 22,707.2'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.inputs.certificate_consumption_heated_area: 22707.2 m²'
    )
  })

  it('omits total and area-derivation provenance for a partial certificate without approved area', () => {
    const result = deriveResult({
      properties: createCertificateViewProperties({
        completeness: 'partial',
        heatedArea: null,
      }),
    })
    if (result.status !== 'resolved') {
      throw new Error('Expected resolved partial certificate provenance')
    }

    renderView({ result })

    const view = screen.getByTestId('building-info-provenance-view')
    const itemIds = result.summary.items.map(({ id }) => id)

    expect(
      screen
        .getAllByTestId('building-info-provenance-item')
        .map((item) => item.getAttribute('data-provenance-item-id'))
    ).toEqual(itemIds)
    expect(itemIds.some((id) => id.includes('certificateTotal'))).toBe(false)
    expect(itemIds.some((id) => id.includes('perSquareMeter'))).toBe(false)
    expect(itemIds).toContain(
      'energyConsumption/certificateConsumption/note/partialRecord'
    )
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.sources.energy_certificate_register'
    )
    expect(view).not.toHaveTextContent(
      'sidebar.building_info.provenance.calculations.certificate_annual_divided_by_heated_area'
    )
    expect(view).not.toHaveTextContent(
      'sidebar.building_info.provenance.metadata.certificate_heated_area'
    )
    expect(view).not.toHaveTextContent(
      'sidebar.building_info.provenance.inputs.certificate_consumption_heated_area'
    )
  })

  it('keeps modeled and origin-unavailable class provenance distinct', () => {
    const modeledResult = deriveResult({
      properties: {
        building_key: 'modeled-provenance-view',
        energy_class: 'D',
        is_energy_class_modeled: true,
      },
      locale: 'fi',
    })
    const modeledView = renderView({ result: modeledResult })

    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.fields.energy_class_modeled'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.categories.modeled_output'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.view.documented_method'
    )
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.modeled_class_2018: 2018'
    )

    modeledView.unmount()
    const unknownResult = deriveResult({
      properties: {
        building_key: 'unknown-origin-provenance-view',
        energy_class: 'C',
        is_energy_class_modeled: 'true',
      },
    })
    renderView({ result: unknownResult })

    const unknownView = screen.getByTestId('building-info-provenance-view')
    expect(unknownView).toHaveTextContent(
      'sidebar.building_info.provenance.fields.energy_class_origin_unavailable'
    )
    expect(unknownView).toHaveTextContent(
      'sidebar.building_info.provenance.categories.origin_unavailable'
    )
    expect(unknownView).toHaveTextContent(
      'sidebar.building_info.provenance.metadata.energy_class_origin_unavailable'
    )
    expect(unknownView).not.toHaveTextContent(
      'sidebar.building_info.provenance.fields.energy_class_official'
    )
    expect(unknownView).not.toHaveTextContent(
      'sidebar.building_info.provenance.fields.energy_class_modeled'
    )
  })

  it('renders only the two resolved Water-only entries and no scenario note', () => {
    const result = deriveResult({
      properties: {
        building_key: 'water-only-provenance-view',
        floor_area: 100,
        distr_default_total: null,
      },
    })
    if (result.status !== 'resolved') {
      throw new Error('Expected resolved Water-only provenance')
    }

    renderView({ result })

    expect(
      screen
        .getAllByTestId('building-info-provenance-item')
        .map((item) => item.getAttribute('data-provenance-item-id'))
    ).toEqual([
      'energyConsumption/estimatedConsumption/primaryMetric/water/value',
      'energyConsumption/estimatedConsumption/primaryMetric/water/residentCountControl',
    ])
    expect(
      screen.getByTestId('building-info-provenance-view')
    ).not.toHaveTextContent(
      'sidebar.building_info.provenance.fields.estimated_consumption_note'
    )
  })

  it('fails closed without exposing partial items or raw diagnostics', () => {
    const result: EnergymapBuildingInfoProvenanceSummaryResult = {
      status: 'contractFailure',
      locale: 'fi',
      failures: [
        {
          failureType: 'catalogResolution',
          location: {
            panelId: 'buildingDetails',
            sectionId: 'identity',
            path: 'internal/raw/path',
          },
          itemKind: 'row',
          reason: 'unknown-identity',
          id: 'internal.secret.source',
        },
      ],
    }
    const onClose = jest.fn()

    renderView({ result, onClose })

    const view = screen.getByTestId('building-info-provenance-view')
    expect(view).toHaveAttribute('data-summary-status', 'contractFailure')
    expect(view).toHaveAttribute('data-summary-locale', 'fi')
    expect(view).toHaveTextContent(
      'sidebar.building_info.provenance.view.integration_unavailable'
    )
    expect(
      screen.queryAllByTestId('building-info-provenance-item')
    ).toHaveLength(0)
    expect(view).not.toHaveTextContent('internal/raw/path')
    expect(view).not.toHaveTextContent('internal.secret.source')
    expect(view).not.toHaveTextContent('unknown-identity')

    fireEvent.click(
      screen.getByRole('button', {
        name: 'sidebar.building_info.provenance.view.close',
      })
    )
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
