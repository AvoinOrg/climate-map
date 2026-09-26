import React from 'react'

import { Box } from '#/common/style/theme'
import { Button } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { Cross } from '#/components/icons'
import type {
  EnergymapBuildingInfoMissingData,
  EnergymapBuildingInfoText,
  EnergymapBuildingInfoSelectedEnergyConsumption,
} from 'applets/energy/common/buildingInfo'

import type { EnergymapBuildingInfoProvenanceSummaryResult } from 'applets/energy/common/buildingInfoProvenanceSummary'

const VIEW_TRANSLATION_PREFIX = 'sidebar.building_info.provenance.view'

const MissingInfoText = ({
  text,
  locale,
}: {
  text: EnergymapBuildingInfoText
  locale: string
}) => {
  if (text.type === 'plain') return <>{text.text}</>
  if (text.type === 'sequence')
    return (
      <>
        {text.parts.map((part, index) => (
          <React.Fragment key={index}>
            {index > 0 && text.separator}
            <MissingInfoText text={part} locale={locale} />
          </React.Fragment>
        ))}
      </>
    )
  return (
    <TText
      keyName={text.keyName}
      params={text.params}
      ns="energiakartta"
      language={locale}
    />
  )
}

export type BuildingInfoProvenanceViewProps = {
  missingData: EnergymapBuildingInfoMissingData | null
  energyProvenance?: EnergymapBuildingInfoProvenanceSummaryResult | null
  selectedEnergy?: EnergymapBuildingInfoSelectedEnergyConsumption
  locale: string
  regionId: string
  headingId: string
  headingRef: React.Ref<HTMLHeadingElement>
  forceMobileLayout?: boolean
  onClose: () => void
}

export const BuildingInfoProvenanceView = ({
  missingData,
  energyProvenance,
  selectedEnergy,
  locale,
  regionId,
  headingId,
  headingRef,
  forceMobileLayout = false,
  onClose,
}: BuildingInfoProvenanceViewProps) => (
  <Box
    component="section"
    role="region"
    id={regionId}
    aria-labelledby={headingId}
    data-testid="building-info-provenance-view"
    data-missing-data-status={missingData == null ? 'unavailable' : 'resolved'}
    data-missing-data-locale={locale}
    sx={{
      minWidth: 0,
      px: { mobile: '1rem', desktop: '1.5rem' },
      pt: forceMobileLayout ? '1rem' : { mobile: '1rem', desktop: '6.25rem' },
      pb: { mobile: '8rem', desktop: '1.5rem' },
      backgroundColor: '#f9f9f9',
      color: '#111111',
    }}
  >
    <Box
      sx={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem',
        mb: '1.5rem',
      }}
    >
      <Box
        component="h2"
        id={headingId}
        ref={headingRef}
        tabIndex={-1}
        data-testid="building-info-provenance-heading"
        sx={{
          m: 0,
          flex: '1 1 12rem',
          minWidth: 0,
          fontSize: { mobile: '1.25rem', desktop: '1.5rem' },
          fontWeight: 700,
          lineHeight: 1.25,
          '&:focus-visible': {
            outline: '2px solid currentColor',
            outlineOffset: '3px',
          },
        }}
      >
        <TText
          keyName={`${VIEW_TRANSLATION_PREFIX}.heading`}
          ns="energiakartta"
          language={locale}
        />
      </Box>
      <Button
        type="button"
        size="small"
        variant="text"
        startIcon={<Cross aria-hidden="true" sx={{ width: 14, height: 14 }} />}
        onClick={onClose}
      >
        <TText
          keyName={`${VIEW_TRANSLATION_PREFIX}.close`}
          ns="energiakartta"
          language={locale}
        />
      </Button>
    </Box>
    {selectedEnergy?.metric != null &&
      energyProvenance?.status === 'resolved' && (
        <Box
          data-testid="building-info-energy-evidence"
          sx={{
            mb: '2rem',
            maxWidth: '42rem',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            overflowWrap: 'anywhere',
          }}
        >
          <Box component="h3" sx={{ fontSize: '1rem', mt: 0 }}>
            <MissingInfoText
              text={selectedEnergy.metric.label}
              locale={locale}
            />
          </Box>
          {selectedEnergy.values.map((value) => (
            <Box component="p" key={value.id} sx={{ my: '0.25rem' }}>
              <MissingInfoText text={value.label} locale={locale} />
              {' — '}
              <MissingInfoText text={value.text} locale={locale} />{' '}
              {value.unitKey && (
                <TText
                  keyName={value.unitKey}
                  ns="energiakartta"
                  language={locale}
                />
              )}
            </Box>
          ))}
          <Box component="ul" sx={{ pl: '1.25rem' }}>
            {energyProvenance.summary.sources.map((source) => (
              <li key={source.id}>
                <TText
                  keyName={source.key}
                  ns="energiakartta"
                  language={locale}
                />
              </li>
            ))}
            {energyProvenance.summary.calculations.map((calculation) => (
              <li key={calculation.id}>
                <TText
                  keyName={calculation.key}
                  ns="energiakartta"
                  language={locale}
                />
              </li>
            ))}
          </Box>
          <Box
            component="dl"
            sx={{
              m: 0,
              '& dt': { mt: '0.75rem', fontWeight: 600 },
              '& dd': { m: 0 },
            }}
          >
            {energyProvenance.summary.inputs
              .filter(
                (input) =>
                  input.selectedEvidenceItemIds.length > 0 &&
                  input.calculationId == null &&
                  (input.metadataIds?.length ?? 0) === 0
              )
              .map((input) => (
                <React.Fragment key={input.id}>
                  <dt>
                    <TText
                      keyName={input.labelKey}
                      ns="energiakartta"
                      language={locale}
                    />
                  </dt>
                  {input.value != null && (
                    <dd>
                      {typeof input.value === 'number'
                        ? new Intl.NumberFormat(locale, {
                            maximumFractionDigits: 2,
                          }).format(input.value)
                        : input.value}
                      {input.value != null && input.unit
                        ? ` ${input.unit}`
                        : null}
                    </dd>
                  )}
                </React.Fragment>
              ))}
            {energyProvenance.summary.metadata.map((metadata) => (
              <React.Fragment key={metadata.id}>
                <dt>
                  <TText
                    keyName={metadata.key}
                    ns="energiakartta"
                    language={locale}
                  />
                </dt>
                {metadata.value != null && (
                  <dd>
                    {metadata.id === 'certificateBasis' ? (
                      <TText
                        keyName="sidebar.building_info.panels.energy.certificate.context.standardized_calculation"
                        ns="energiakartta"
                        language={locale}
                      />
                    ) : metadata.id === 'certificateCompleteness' ? (
                      <TText
                        keyName={`sidebar.building_info.panels.energy.certificate.context.completeness_${metadata.value}`}
                        ns="energiakartta"
                        language={locale}
                      />
                    ) : (
                      metadata.value
                    )}
                    {metadata.id === 'certificateHeatedArea' && (
                      <>
                        {' '}
                        <TText
                          keyName="sidebar.building_info.units.square_meters"
                          ns="energiakartta"
                          language={locale}
                        />
                      </>
                    )}
                  </dd>
                )}
              </React.Fragment>
            ))}
          </Box>
          {energyProvenance.summary.sources.some(
            ({ id }) => id === 'energyCertificateRegister'
          ) && (
            <Box component="p">
              <TText
                keyName="sidebar.building_info.panels.energy.certificate.note.historical_not_measured"
                ns="energiakartta"
                language={locale}
              />
            </Box>
          )}
        </Box>
      )}
    {energyProvenance?.status === 'contractFailure' && (
      <Box component="p" role="status">
        <TText
          keyName="sidebar.building_info.missing_data.unavailable"
          ns="energiakartta"
          language={locale}
        />
      </Box>
    )}
    <Box component="h3" sx={{ fontSize: '1rem' }}>
      <TText
        keyName={`${VIEW_TRANSLATION_PREFIX}.missing`}
        ns="energiakartta"
        language={locale}
      />
    </Box>
    {missingData != null && missingData.items.length > 0 ? (
      <Box
        component="ul"
        sx={{
          m: 0,
          pl: '1.25rem',
          maxWidth: '42rem',
          fontSize: '0.875rem',
          lineHeight: 1.5,
        }}
      >
        {missingData.items.map((item) => (
          <Box
            component="li"
            key={item.id}
            data-testid="building-info-missing-item"
            data-missing-item-id={item.id}
            sx={{ mb: '1rem', overflowWrap: 'anywhere' }}
          >
            <Box component="span" sx={{ fontWeight: 600 }}>
              <MissingInfoText text={item.label} locale={locale} />
            </Box>
            <Box
              component="p"
              sx={{ m: 0, mt: '0.25rem', color: 'neutral.darker' }}
            >
              <MissingInfoText text={item.reason} locale={locale} />
            </Box>
          </Box>
        ))}
      </Box>
    ) : (
      <Box
        component="p"
        role="status"
        sx={{ m: 0, fontSize: '0.875rem', lineHeight: 1.5 }}
      >
        <TText
          keyName={`sidebar.building_info.missing_data.${missingData == null ? 'unavailable' : 'empty'}`}
          ns="energiakartta"
          language={locale}
        />
      </Box>
    )}
  </Box>
)
