import { Box } from '#/common/style/theme'
import TText from '#/components/common/TText'
import type { AreaDetail } from 'applets/energy/common/types/areas'
import {
  AREA_DISTRIBUTIONS,
  AREA_SUMS,
  distributionRows,
  officialScaleSummary,
} from 'applets/energy/common/areas/detailPresentation'

const ns = 'energiakartta'
const prefix = 'sidebar.area_map.'
const Availability = ({
  summary,
  official = false,
}: {
  summary: { known_building_count: number; unknown_building_count: number }
  official?: boolean
}) => (
  <Box component="p" sx={{ fontSize: '.8rem', my: 1 }}>
    <TText
      ns={ns}
      keyName={`${prefix}${official ? 'official_information' : 'known_unknown'}`}
      params={{
        known: summary.known_building_count,
        unknown: summary.unknown_building_count,
      }}
    />
  </Box>
)
const Unavailable = () => (
  <TText ns={ns} keyName={`${prefix}value_unavailable`} />
)
const headingSx = { fontSize: '1rem', mt: 3, mb: 1, lineHeight: 1.4 }
const rowsSx = {
  m: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 1,
  '& dd': { m: 0, textAlign: 'right' },
  '& dt': { overflowWrap: 'anywhere' },
}
const EnergyAreaMetrics = ({
  detail,
  locale,
}: {
  detail: AreaDetail
  locale: string
}) => {
  const number = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 })
  const percent = new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  })
  const official = detail.metrics.official_class
  return (
    <Box
      data-testid="energy-area-metrics"
      sx={{ minWidth: 0, overflowWrap: 'anywhere' }}
    >
      <Box component="h2" sx={headingSx}>
        <TText ns={ns} keyName={`${prefix}official_classes`} />
      </Box>
      <Box component="p" sx={{ fontSize: '.8rem' }}>
        <TText ns={ns} keyName={`${prefix}official_exclusions`} />
      </Box>
      {official && <Availability summary={official} official />}
      {(['2013', '2018'] as const).map((scale) => {
        const summary = officialScaleSummary({ detail, scale })
        return (
          <Box
            component="section"
            key={scale}
            data-testid={`energy-area-scale-${scale}`}
          >
            <Box component="h3" sx={{ ...headingSx, mt: 2 }}>
              <TText ns={ns} keyName={`${prefix}scale`} params={{ scale }} />
            </Box>
            {summary ? (
              <>
                <Box component="p" sx={{ fontSize: '.8rem' }}>
                  <TText
                    ns={ns}
                    keyName={`${prefix}scale_denominator`}
                    params={{
                      count: summary.denominator,
                      population: summary.population,
                    }}
                  />
                </Box>
                {summary.denominator === 0 && (
                  <Box component="p">
                    <TText ns={ns} keyName={`${prefix}no_valid_classes`} />
                  </Box>
                )}
                <Box component="dl" sx={rowsSx}>
                  {summary.rows.map((row) => (
                    <Box key={row.key} sx={{ display: 'contents' }}>
                      <Box
                        component="dt"
                        sx={{ position: 'relative', py: 0.5 }}
                      >
                        <Box
                          aria-hidden="true"
                          sx={{
                            position: 'absolute',
                            inset: '0 auto 0 0',
                            width: `${(row.fraction ?? 0) * 100}%`,
                            bgcolor: '#e1edf6',
                            zIndex: 0,
                          }}
                        />
                        <Box
                          component="span"
                          sx={{ position: 'relative', px: 0.5 }}
                        >
                          <TText
                            ns={ns}
                            keyName={`${prefix}class`}
                            params={{ letter: row.key }}
                          />
                        </Box>
                      </Box>
                      <Box component="dd" sx={{ py: 0.5 }}>
                        {number.format(row.count)} ·{' '}
                        {row.fraction == null ? (
                          <Unavailable />
                        ) : (
                          percent.format(row.fraction)
                        )}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Unavailable />
            )}
          </Box>
        )
      })}
      {AREA_DISTRIBUTIONS.map((metric) => {
        const summary = detail.metrics[metric]
        return (
          <Box
            component="section"
            key={metric}
            data-testid={`energy-area-metric-${metric}`}
          >
            <Box component="h2" sx={headingSx}>
              <TText ns={ns} keyName={`${prefix}summary.${metric}`} />
            </Box>
            {summary ? (
              <>
                <Availability summary={summary} />
                <Box component="dl" sx={rowsSx}>
                  {distributionRows({ metric, summary }).map((row, index) => (
                    <Box key={index} sx={{ display: 'contents' }}>
                      <Box component="dt">
                        <TText
                          ns={ns}
                          keyName={row.keyName}
                          params={row.index ? { index: row.index } : undefined}
                        />
                      </Box>
                      <Box component="dd">
                        <TText
                          ns={ns}
                          keyName={`${prefix}buildings`}
                          params={{ count: row.count }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </>
            ) : (
              <Unavailable />
            )}
          </Box>
        )
      })}
      <Box component="h2" sx={headingSx}>
        <TText ns={ns} keyName={`${prefix}area_sums`} />
      </Box>
      {AREA_SUMS.map((metric) => {
        const summary = detail.metrics[metric]
        return (
          <Box
            component="section"
            key={metric}
            data-testid={`energy-area-metric-${metric}`}
          >
            <Box component="h3" sx={{ ...headingSx, mt: 2 }}>
              <TText ns={ns} keyName={`${prefix}summary.${metric}`} />
            </Box>
            <Box>
              {summary?.sum == null ? (
                <Unavailable />
              ) : (
                `${number.format(summary.sum)}\u00a0m²`
              )}
            </Box>
            {summary && <Availability summary={summary} />}
          </Box>
        )
      })}
    </Box>
  )
}
export default EnergyAreaMetrics
