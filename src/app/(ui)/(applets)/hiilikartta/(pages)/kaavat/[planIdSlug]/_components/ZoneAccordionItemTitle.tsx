import { Box, Typography } from '@mui/material'
import { useTranslate } from '@tolgee/react'

import { Exclamation } from '#/components/icons'
import { PlanDataFeature } from '../../../../common/types'

const ZoneAccordionItemTitle = ({
  name,
  zoningCode,
  isValidZoningCode,
}: {
  name: PlanDataFeature['properties']['name']
  zoningCode: PlanDataFeature['properties']['zoning_code']
  isValidZoningCode: boolean
}) => {
  const { t } = useTranslate('hiilikartta')

  let title = ''
  if (typeof name === 'string') {
    if (name === '') {
      title += t('sidebar.plan_settings.new_area')
    } else {
      title += name
    }
  } else {
    title += `${t('sidebar.plan_settings.area')} ${name}`
  }

  if (zoningCode != null && zoningCode != '') {
    title = `${name} (${zoningCode})`
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        color: isValidZoningCode ? 'auto' : 'warning.main',
        justifyContent: 'space-between',
        flex: '1',
        height: '100%',
        alignItems: 'center',
        pr: 1,
      }}
    >
      <Typography sx={{ display: 'inline' }}>{`${title}`}</Typography>
      {!isValidZoningCode && (
        <Exclamation sx={{ height: '1.4rem' }}></Exclamation>
      )}
    </Box>
  )
}

export default ZoneAccordionItemTitle
