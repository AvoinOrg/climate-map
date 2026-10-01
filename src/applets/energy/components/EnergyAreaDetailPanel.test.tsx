import React from 'react'
import '@testing-library/jest-dom'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { Tolgee, TolgeeProvider } from '@tolgee/react'
import { FormatIcu } from '@tolgee/format-icu'
import { AppThemeProvider } from '#/common/style/theme'
import fi from '@i18n/energiakartta/fi.json'
import en from '@i18n/energiakartta/en.json'
import { AreaRuntimeContext } from 'applets/energy/common/areas/AreaRuntimeContext'
import { useAppletStore } from 'applets/energy/state/appletStore'
import { parseAreaDetail } from 'applets/energy/common/areas/contract'
import type { AreaApiProblem } from 'applets/energy/common/types/areas'
import dataset from '../../../../utils/test/energyAreas/dataset.json'
import EnergyAreaDetailPanel, {
  getAreaSourceName,
} from './EnergyAreaDetailPanel'
import EnergyAreaControls from './EnergyAreaControls'

jest.mock('overlayscrollbars-react', () => ({
  OverlayScrollbarsComponent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}))
const request = {
  releaseId: dataset.releaseIds[0],
  level: 'postal_code' as const,
  areaCode: '00100',
}
const detail = parseAreaDetail(
  dataset.snapshots[0].details['postal_code:00100'],
  { request }
)
const close = jest.fn()
const retryDetail = jest.fn()
const refresh = jest.fn()
const retryTiles = jest.fn()
const base = {
  status: 'ready' as const,
  refreshFailed: false,
  tileFailed: false,
  request,
  detailLoading: false,
  close,
  canGoBack: false,
  back: jest.fn(),
  navigateRelated: jest.fn(),
  showWholePostalArea: jest.fn(),
  showBuildings: jest.fn(),
  selectMode: jest.fn(),
  retryDetail,
  refresh,
  retryTiles,
}
const mount = ({
  locale,
  value,
  controlsOnly = false,
  compact = false,
}: {
  locale: string
  value: Partial<React.ContextType<typeof AreaRuntimeContext>>
  controlsOnly?: boolean
  compact?: boolean
}) => {
  const tolgee = Tolgee()
    .use(FormatIcu())
    .init({
      language: locale,
      defaultNs: 'energiakartta',
      staticData: { 'fi:energiakartta': fi, 'en:energiakartta': en },
    })
  return render(
    <TolgeeProvider tolgee={tolgee}>
      <AppThemeProvider disableCssBaseline>
        <AreaRuntimeContext.Provider value={{ ...base, ...value }}>
          {controlsOnly ? (
            <EnergyAreaControls locale={locale} compact={compact} />
          ) : (
            <EnergyAreaDetailPanel locale={locale} />
          )}
        </AreaRuntimeContext.Provider>
      </AppThemeProvider>
    </TolgeeProvider>
  )
}
afterEach(cleanup)
it.each(['fi', 'en'])(
  'renders localized whole-area summary, all-building scope, legend and provenance (%s)',
  async (locale) => {
    useAppletStore.setState({
      effectiveGeography: 'postal_code',
      areaAvailable: true,
    })
    mount({ locale, value: { detail } })
    expect(await screen.findByTestId('energy-area-detail')).toHaveTextContent(
      locale === 'fi' ? '5 rakennusta' : '5 buildings'
    )
    expect(screen.getByTestId('energy-area-detail')).toHaveTextContent('60')
    expect(screen.getByTestId('energy-area-detail')).toHaveTextContent('2026')
    expect(screen.getByTestId('energy-area-detail')).not.toHaveTextContent(
      /sidebar\.|11111111|modeled|diagnostic/
    )
    expect(
      screen.getByRole('list', { name: /legend|selite/ })
    ).toHaveTextContent(locale === 'fi' ? 'Ei saatavilla' : 'Unavailable')
    fireEvent.click(
      screen.getByRole('button', {
        name: locale === 'fi' ? 'Sulje aluetiedot' : 'Close area details',
      })
    )
    expect(close).toHaveBeenCalled()
  }
)
it.each(['fi', 'en'])(
  'distinguishes loading, empty, null and valid zero (%s)',
  async (locale) => {
    mount({ locale, value: { detailLoading: true } })
    expect(await screen.findByTestId('energy-area-detail')).toHaveTextContent(
      locale === 'fi' ? 'ladataan' : 'Loading'
    )
    cleanup()
    mount({
      locale,
      value: {
        detail: {
          ...detail,
          building_count: 0,
          valid_official_class_count: 0,
          certificate_coverage: null,
        },
      },
    })
    expect(await screen.findByTestId('energy-area-detail')).toHaveTextContent(
      locale === 'fi' ? '0 rakennusta' : '0 buildings'
    )
    expect(screen.getByTestId('energy-area-detail')).toHaveTextContent(
      locale === 'fi' ? 'Ei saatavilla' : 'Unavailable'
    )
    cleanup()
    mount({
      locale,
      value: {
        detail: {
          ...detail,
          valid_official_class_count: 0,
          certificate_coverage: 0,
        },
      },
    })
    expect(await screen.findByTestId('energy-area-detail')).toHaveTextContent(
      /0\s?%/
    )
    expect(screen.getByTestId('energy-area-detail')).not.toHaveTextContent(
      locale === 'fi' ? 'Ei saatavilla' : 'Unavailable'
    )
  }
)
it.each([
  'not-found',
  'rejected-request',
  'unsupported-contract',
  'malformed-contract',
  'unavailable',
  'network',
  'http',
] as AreaApiProblem['kind'][])(
  'localizes %s and provides a working retry',
  async (detailProblem) => {
    mount({ locale: 'en', value: { detailProblem } })
    expect(await screen.findByRole('alert')).not.toHaveTextContent(
      /sidebar\.|UUID|SQL|diagnostic/
    )
    fireEvent.click(screen.getByRole('button', { name: 'Retry area details' }))
    expect(retryDetail).toHaveBeenCalled()
  }
)
it('uses only actually available source names, skipping empty names and falling back to the code', () => {
  expect(
    getAreaSourceName({
      names: { fi: '', sv: 'Svenskt namn', en: null },
      locale: 'en',
      code: '00100',
    })
  ).toBe('Svenskt namn')
  expect(
    getAreaSourceName({
      names: { fi: ' ', sv: '', en: null },
      locale: 'fi',
      code: '00100',
    })
  ).toBe('00100')
})
it('keeps Buildings operable without configuration and explains manual low zoom', async () => {
  useAppletStore.setState({
    geographyMode: 'buildings',
    effectiveGeography: 'buildings',
    areaAvailable: false,
    areaZoom: 11.999,
  })
  mount({
    locale: 'en',
    value: {
      status: 'unavailable',
      problem: 'not-configured',
      request: undefined,
    },
    controlsOnly: true,
  })
  expect(await screen.findByTestId('energy-area-controls')).toHaveTextContent(
    'The building map remains available'
  )
  expect(screen.getByTestId('energy-area-controls')).toHaveTextContent(
    'Zoom in to see buildings'
  )
  expect(
    screen.queryByRole('button', { name: 'Refresh area data' })
  ).not.toBeInTheDocument()
})
it('retains the current release on refresh failure and exposes separate tile retry', async () => {
  useAppletStore.setState({
    geographyMode: 'region',
    effectiveGeography: 'region',
    areaAvailable: true,
  })
  mount({
    locale: 'en',
    value: { refreshFailed: true, tileFailed: true },
    controlsOnly: true,
  })
  expect(await screen.findByTestId('energy-area-controls')).toHaveTextContent(
    'previously loaded release'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Retry area tiles' }))
  expect(retryTiles).toHaveBeenCalled()
})

it('keeps the frozen all-building scope visible when the compact legend is closed', async () => {
  useAppletStore.setState({
    geographyMode: 'postal_code',
    effectiveGeography: 'postal_code',
    areaAvailable: true,
  })
  mount({ locale: 'en', value: {}, controlsOnly: true, compact: true })
  const explanation = await screen.findByText(
    'Area summaries cover all buildings in the frozen snapshot. Building themes and filters do not apply to areas.'
  )
  expect(explanation).toBeVisible()
  expect(
    screen
      .getByText('Valid energy certificate coverage – legend')
      .closest('details')
  ).not.toHaveAttribute('open')
})

it.each(['fi', 'en'])(
  'renders complete scale/category/sum details through Tolgee ICU (%s)',
  async (locale) => {
    mount({ locale, value: { detail } })
    const panel = await screen.findByTestId('energy-area-detail')
    expect(screen.getByTestId('energy-area-scale-2013')).toHaveTextContent(
      locale === 'fi' ? '1 voimassa oleva' : '1 valid class'
    )
    expect(screen.getByTestId('energy-area-scale-2018')).toHaveTextContent(
      locale === 'fi' ? '2 voimassa olevaa' : '2 valid classes'
    )
    for (const [key, amount, known, unknown] of [
      ['floor_area', 408, 4, 1],
      ['gross_floor_area', 457, 3, 2],
      ['total_area', 546, 3, 2],
      ['energy_certificate_heated_net_area', 276, 3, 2],
    ] as const) {
      const section = screen.getByTestId(`energy-area-metric-${key}`)
      expect(section).toHaveTextContent(`${amount} m²`)
      expect(section).toHaveTextContent(
        locale === 'fi'
          ? `${known} rakennuksen tiedot tunnetaan`
          : `${known} buildings known`
      )
      expect(section).toHaveTextContent(
        locale === 'fi'
          ? `${unknown} rakennuksen ${unknown === 1 ? 'tieto puuttuu' : 'tiedot puuttuvat'}`
          : `${unknown} ${unknown === 1 ? 'building' : 'buildings'} unknown`
      )
    }
    expect(
      screen.getByTestId('energy-area-metric-ventilation')
    ).toHaveTextContent(locale === 'fi' ? 'Ei tietoa' : 'Unknown information')
    expect(
      screen.getByTestId('energy-area-metric-main_purpose')
    ).toHaveTextContent(
      locale === 'fi'
        ? 'Luokka ilman tunnistettua nimeä'
        : 'Unrecognized category'
    )
    expect(panel).not.toHaveTextContent(
      /sidebar\.|0110|no_info|unknown_scale|11111111|modeled|SQL/
    )
  }
)
it.each(['fi', 'en'])(
  'keeps full crosswalk while scoped, exposes whole-area/buildings/back actions (%s)',
  async (locale) => {
    const scopedRequest = { ...request, municipalityCode: '091' }
    const scoped = {
      ...detail,
      building_count: 2,
      scope: {
        municipality_code: '091',
        geometry: 'full_postal_area' as const,
      },
    }
    mount({
      locale,
      value: { request: scopedRequest, detail: scoped, canGoBack: true },
    })
    expect(
      await screen.findByTestId('energy-area-detail-scope')
    ).toHaveTextContent('091')
    expect(screen.getByTestId('energy-area-relations')).toHaveTextContent('005')
    expect(screen.getByTestId('energy-area-relations')).toHaveTextContent('091')
    fireEvent.click(
      screen.getByRole('button', {
        name:
          locale === 'fi'
            ? 'Näytä koko postinumeroalue'
            : 'Show whole postal area',
      })
    )
    expect(base.showWholePostalArea).toHaveBeenCalled()
    fireEvent.click(
      screen.getByRole('button', {
        name: locale === 'fi' ? 'Siirry rakennuksiin' : 'Explore buildings',
      })
    )
    expect(base.showBuildings).toHaveBeenCalled()
    fireEvent.click(
      screen.getAllByRole('button', {
        name:
          locale === 'fi'
            ? 'Takaisin edelliselle aluetasolle'
            : 'Back to previous geography',
      })[0]
    )
    expect(base.back).toHaveBeenCalled()
  }
)
