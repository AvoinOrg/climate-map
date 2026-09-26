import React from 'react'
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Tolgee, TolgeeProvider } from '@tolgee/react'
import { FormatIcu } from '@tolgee/format-icu'
import { AppThemeProvider } from '#/common/style/theme'
import en from '@i18n/energiakartta/en.json'
import fi from '@i18n/energiakartta/fi.json'
import { createEnergymapBuildingInfoPresentation } from 'applets/energy/common/buildingInfo'
import { BuildingInfoProvenanceView } from './BuildingInfoProvenanceView'

it.each(['fi', 'en'])(
  'renders required source reasons through real Tolgee ICU resources (%s)',
  async (locale) => {
    const tolgee = Tolgee()
      .use(FormatIcu())
      .init({
        language: locale,
        defaultNs: 'energiakartta',
        staticData: { 'en:energiakartta': en, 'fi:energiakartta': fi },
      })
    const { missingData } = createEnergymapBuildingInfoPresentation({
      locale,
      selectedBuilding: {
        id: 'local-copy',
        buildingKey: 'local-copy',
        source: 'energymap_building_polygons',
        sourceLayer: 'energymap_building_polygons',
        layerId: 'energymap_building_polygons-fill',
        properties: {
          permanent_building_identifier: '00123',
          main_purpose: '02',
          completion_date: '2024-02-30',
          floor_area: 0,
          energy_class: 'C',
          energy_certificate_consumption: '{}',
        },
      },
    })
    render(
      <TolgeeProvider tolgee={tolgee}>
        <AppThemeProvider disableCssBaseline>
          <BuildingInfoProvenanceView
            missingData={missingData}
            locale={locale}
            regionId="source-region"
            headingId="source-heading"
            headingRef={null}
            onClose={() => {}}
          />
        </AppThemeProvider>
      </TolgeeProvider>
    )
    const list = await screen.findByRole('list')
    expect(list).toHaveTextContent(
      locale === 'fi'
        ? 'Ryhti-aineistosta toimitettu valmistumispäivä'
        : 'The completion date supplied from Ryhti'
    )
    expect(list).toHaveTextContent(
      locale === 'fi'
        ? 'julkisesta energiatodistusrekisteristä'
        : 'public energy-certificate register'
    )
    expect(list).not.toHaveTextContent(
      /sidebar\.building_info|completion_date|schema_version|unsupported_building_purpose/
    )
    expect(
      screen
        .getAllByRole('listitem')
        .every((item) => item.querySelector('p')?.textContent)
    ).toBe(true)
  }
)

it.each(
  [
    {
      origin: true,
      en: 'The modeled energy class supplied by the Energy Map class model is not usable class text.',
      fi: 'Energiakartan energialuokkamallista toimitettu mallinnettu energialuokka ei ole käyttökelpoista luokkatietoa.',
    },
    {
      origin: false,
      en: 'The official class supplied from the public energy-certificate register is not usable class text.',
      fi: 'Julkisesta energiatodistusrekisteristä toimitettu virallinen luokka ei ole käyttökelpoista luokkatietoa.',
    },
    {
      origin: undefined,
      en: 'The effective energy class supplied in the published Energy Map record is not usable class text. The record does not establish whether it comes from the public energy-certificate register or the Energy Map class model.',
      fi: 'Energiakartan julkaistussa aineistossa toimitettu energialuokka ei ole käyttökelpoista luokkatietoa. Aineistosta ei selviä, onko luokka peräisin julkisesta energiatodistusrekisteristä vai Energiakartan energialuokkamallista.',
    },
  ].flatMap((testCase) =>
    ['fi', 'en'].map((locale) => ({ ...testCase, locale }))
  )
)(
  'renders invalid effective class with origin $origin in $locale',
  async ({ origin, locale, en: expectedEn, fi: expectedFi }) => {
    const tolgee = Tolgee()
      .use(FormatIcu())
      .init({
        language: locale,
        defaultNs: 'energiakartta',
        staticData: { 'en:energiakartta': en, 'fi:energiakartta': fi },
      })
    const { missingData } = createEnergymapBuildingInfoPresentation({
      locale,
      selectedBuilding: {
        id: 'invalid-class',
        buildingKey: 'invalid-class',
        source: 'energymap_building_polygons',
        sourceLayer: 'energymap_building_polygons',
        layerId: 'energymap_building_polygons-fill',
        properties: {
          permanent_building_identifier: '00123',
          energy_class: true,
          is_energy_class_modeled: origin,
          modeled_energy_class_reason: 'missing_reference_value',
        },
      },
    })
    render(
      <TolgeeProvider tolgee={tolgee}>
        <AppThemeProvider disableCssBaseline>
          <BuildingInfoProvenanceView
            missingData={missingData}
            locale={locale}
            regionId="source-region"
            headingId="source-heading"
            headingRef={null}
            onClose={() => {}}
          />
        </AppThemeProvider>
      </TolgeeProvider>
    )
    await screen.findByRole('list')
    const item = screen
      .getAllByRole('listitem')
      .find(
        (element) =>
          element.dataset.missingItemId === 'buildingDetails.energyClass'
      )!
    expect(item).toHaveTextContent(locale === 'fi' ? expectedFi : expectedEn)
    // Official availability and modeled fallback remain independent of validation.
    expect(item).toHaveTextContent(
      locale === 'fi'
        ? 'virallisen luokan saatavuutta'
        : 'official-class availability and certificate-match outcome cannot be established'
    )
    expect(item).toHaveTextContent(locale === 'fi' ? 'E-luvun' : 'E-value')
    if (origin !== false) {
      expect(item).not.toHaveTextContent(
        locale === 'fi'
          ? 'Julkisesta energiatodistusrekisteristä toimitettu virallinen luokka ei ole'
          : 'The official class supplied from the public energy-certificate register is not usable'
      )
    }
    expect(item).not.toHaveTextContent(
      /sidebar\.building_info|is_energy_class_modeled|missing_reference_value/
    )
  }
)
