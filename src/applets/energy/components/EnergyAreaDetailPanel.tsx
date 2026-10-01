import { useTranslate } from '@tolgee/react'
import { useEffect, useRef } from 'react'
import { Box } from '#/common/style/theme'
import { Button } from '#/components/common/Button'
import TText from '#/components/common/TText'
import { SidebarPanelExtensionPageContainer } from '#/components/Sidebar/SidebarPanelExtensionPageContainer'
import { useEnergyAreaRuntime } from 'applets/energy/common/areas/AreaRuntimeContext'
import EnergyAreaControls from 'applets/energy/components/EnergyAreaControls'
import EnergyAreaMetrics from 'applets/energy/components/EnergyAreaMetrics'
import EnergyAreaBackButton from 'applets/energy/components/EnergyAreaBackButton'

const ns = 'energiakartta'
const prefix = 'sidebar.area_map.'
export const getAreaSourceName = ({
  names,
  locale,
  code,
}: {
  names: { fi?: string | null; sv?: string | null; en?: string | null }
  locale: string
  code: string
}) =>
  [names[locale as keyof typeof names], names.fi, names.sv, names.en].find(
    (name) => name?.trim()
  ) ?? code
const EnergyAreaDetailPanel = ({ locale }: { locale: string }) => {
  const { t } = useTranslate(ns)
  const runtime = useEnergyAreaRuntime()
  const { request, detail, detailProblem } = runtime
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [
    request?.releaseId,
    request?.level,
    request?.areaCode,
    request?.municipalityCode,
  ])
  if (!request) return null
  const number = new Intl.NumberFormat(locale)
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  })
  const name = detail
    ? getAreaSourceName({ names: detail.names, locale, code: request.areaCode })
    : request.areaCode
  return (
    <SidebarPanelExtensionPageContainer
      onClose={runtime.close}
      closeAriaLabel={t(`${prefix}close`)}
      additionalControls={<EnergyAreaBackButton />}
      controlsSx={{
        position: 'static',
        backgroundColor: '#fff',
        borderBottom: '1px solid #ddd',
      }}
      contentSx={{
        p: { mobile: 2, desktop: 3 },
        pb: { mobile: 8, desktop: 3 },
        gap: 2,
        overflowWrap: 'anywhere',
      }}
    >
      <Box data-testid="energy-area-detail" aria-label={t(`${prefix}detail`)}>
        <Box
          component="h1"
          ref={heading}
          tabIndex={-1}
          sx={{ m: 0, fontSize: '1.2rem', lineHeight: 1.4 }}
        >
          {name}
        </Box>
        {request.municipalityCode && (
          <Box data-testid="energy-area-detail-scope">
            <Box component="p">
              <TText
                ns={ns}
                keyName={`${prefix}municipality_scope`}
                params={{ code: request.municipalityCode }}
              />
            </Box>
            <Box component="p">
              <TText
                ns={ns}
                keyName={`${prefix}polygon_scope`}
                params={{ code: request.municipalityCode }}
              />
            </Box>
            <Button
              size="small"
              onClick={runtime.showWholePostalArea}
              aria-label={t(`${prefix}whole_postal`)}
            >
              <TText ns={ns} keyName={`${prefix}whole_postal`} />
            </Button>
          </Box>
        )}
        <Box component="p" sx={{ my: 1 }}>
          <TText
            ns={ns}
            keyName={`${prefix}identity`}
            params={{
              level: t(`${prefix}mode.${request.level}`),
              code: request.areaCode,
            }}
          />
        </Box>
        <Box aria-live="polite" aria-busy={runtime.detailLoading}>
          {runtime.detailLoading && (
            <TText ns={ns} keyName={`${prefix}detail_loading`} />
          )}
          {detailProblem && (
            <Box role="alert">
              <TText ns={ns} keyName={`${prefix}error.${detailProblem}`} />
              <Button
                size="small"
                onClick={runtime.retryDetail}
                aria-label={t(`${prefix}retry_detail`)}
              >
                <TText ns={ns} keyName={`${prefix}retry_detail`} />
              </Button>
            </Box>
          )}
          {detail && (
            <>
              {detail.building_count === 0 && (
                <Box component="p">
                  <TText
                    ns={ns}
                    keyName={`${prefix}${request.municipalityCode ? 'empty_intersection' : 'empty'}`}
                  />
                </Box>
              )}
              <Box
                component="dl"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
                  columnGap: 2,
                  rowGap: 1.5,
                  '& dt': { fontWeight: 600 },
                  '& dd': { m: 0 },
                }}
              >
                <Box component="dt">
                  <TText
                    ns={ns}
                    keyName={`${prefix}${request.municipalityCode ? 'scoped_building_count' : 'building_count'}`}
                  />
                </Box>
                <Box component="dd">
                  <TText
                    ns={ns}
                    keyName={`${prefix}buildings`}
                    params={{ count: detail.building_count }}
                  />
                </Box>
                <Box component="dt">
                  <TText ns={ns} keyName={`${prefix}valid_count`} />
                </Box>
                <Box component="dd">
                  {number.format(detail.valid_official_class_count)}
                </Box>
                <Box component="dt">
                  <TText
                    ns={ns}
                    keyName={`${prefix}metric.certificate_coverage`}
                  />
                </Box>
                <Box component="dd">
                  {detail.certificate_coverage == null ? (
                    <TText ns={ns} keyName={`${prefix}value_unavailable`} />
                  ) : (
                    percent.format(detail.certificate_coverage)
                  )}
                </Box>
                <Box component="dt">
                  <TText ns={ns} keyName={`${prefix}boundary_vintage`} />
                </Box>
                <Box component="dd">{String(detail.boundary_vintage)}</Box>
                <Box component="dt">
                  <TText ns={ns} keyName={`${prefix}as_of`} />
                </Box>
                <Box component="dd">
                  {new Intl.DateTimeFormat(locale, {
                    dateStyle: 'medium',
                    timeZone: 'UTC',
                  }).format(new Date(`${detail.as_of}T00:00:00Z`))}
                </Box>
              </Box>
              <Box component="p" sx={{ fontSize: '.8rem' }}>
                <TText
                  ns={ns}
                  keyName={`${prefix}coverage_denominator`}
                  params={{
                    valid: detail.valid_official_class_count,
                    population: detail.building_count,
                  }}
                />
              </Box>
              <Box component="section" data-testid="energy-area-relations">
                <Box component="h2" sx={{ fontSize: '1rem', mt: 3 }}>
                  <TText
                    ns={ns}
                    keyName={`${prefix}related.${detail.related_area_level}`}
                  />
                </Box>
                {detail.region_code && (
                  <Button
                    size="small"
                    onClick={() =>
                      runtime.navigateRelated({
                        level: 'region',
                        areaCode: detail.region_code!,
                      })
                    }
                    aria-label={t(`${prefix}open_related`, {
                      level: t(`${prefix}mode.region`),
                      code: detail.region_code,
                    })}
                  >
                    <TText
                      ns={ns}
                      keyName={`${prefix}region_code`}
                      params={{ code: detail.region_code }}
                    />
                  </Button>
                )}
                <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0 }}>
                  {detail.related_areas.map((related) => (
                    <Box
                      component="li"
                      key={related.area_code}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        my: 1,
                      }}
                    >
                      <Button
                        size="small"
                        onClick={() =>
                          runtime.navigateRelated({
                            level: detail.related_area_level,
                            areaCode: related.area_code,
                          })
                        }
                        aria-label={t(`${prefix}open_related`, {
                          level: t(
                            `${prefix}mode.${detail.related_area_level}`
                          ),
                          code: related.area_code,
                        })}
                      >
                        {related.area_code}
                      </Button>
                      <TText
                        ns={ns}
                        keyName={`${prefix}${detail.level === 'region' ? 'buildings' : 'intersection_count'}`}
                        params={{ count: related.building_count }}
                      />
                    </Box>
                  ))}
                </Box>
                {detail.level === 'postal_code' && (
                  <Button
                    size="small"
                    onClick={runtime.showBuildings}
                    aria-label={t(`${prefix}show_buildings`)}
                  >
                    <TText ns={ns} keyName={`${prefix}show_buildings`} />
                  </Button>
                )}
              </Box>
              <EnergyAreaMetrics detail={detail} locale={locale} />
            </>
          )}
        </Box>
      </Box>
      <EnergyAreaControls locale={locale} />
    </SidebarPanelExtensionPageContainer>
  )
}
export default EnergyAreaDetailPanel
