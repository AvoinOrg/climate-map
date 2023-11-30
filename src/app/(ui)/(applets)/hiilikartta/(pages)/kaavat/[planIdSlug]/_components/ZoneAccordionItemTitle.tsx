import { useEffect, useState } from 'react'
import { Box } from '@mui/material'
import { useTranslate } from '@tolgee/react'

import EditableText from '#/components/common/EditableText'
import { Exclamation } from '#/components/icons'

import { PlanDataFeature } from '../../../../common/types'
import { useAppletStore } from 'applets/hiilikartta/state/appletStore'

const ZoneAccordionItemTitle = ({
  name,
  zoningCode,
  isValidZoningCode,
  onChange,
}: {
  name: PlanDataFeature['properties']['name']
  zoningCode: PlanDataFeature['properties']['zoning_code']
  isValidZoningCode: boolean
  onChange: (event: any) => void
}) => {
  const { t } = useTranslate('hiilikartta')
  const [title, setTitle] = useState('')
  const [titleAppendix, setTitleAppendix] = useState('')

  useEffect(() => {
    if (typeof name === 'string') {
      if (name === '') {
        setTitle(t('sidebar.plan_settings.new_area'))
      } else {
        setTitle(name)
      }
    } else {
      setTitle(`${t('sidebar.plan_settings.area')} ${name}`)
    }
  }, [name])

  useEffect(() => {
    if (zoningCode != null && zoningCode != '') {
      setTitleAppendix(` (${zoningCode})`)
    } else {
      setTitleAppendix('')
    }
  }, [zoningCode])

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'row',
        color: isValidZoningCode ? 'auto' : 'warning.main',
        justifyContent: 'space-between',
        height: '100%',
        alignItems: 'center',
        overflow: 'hidden',
        pr: 1,
        width: 0,
        flexGrow: 1,
      }}
    >
      <EditableText
        value={title}
        valueAppendix={titleAppendix}
        onChange={onChange}
        sx={{ pr: 1 }}
        iconSx={{ fontSize: '16px' }}
      ></EditableText>
      {!isValidZoningCode && (
        <Exclamation sx={{ height: '1.4rem' }}></Exclamation>
      )}
    </Box>
  )
}

export default ZoneAccordionItemTitle
