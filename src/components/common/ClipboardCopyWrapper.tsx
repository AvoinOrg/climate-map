import React from 'react'
import { Box } from '@mui/material'
import { useTranslate } from '@tolgee/react'

import { useUIStore } from '#/common/store'

type Props = {
  textToCopy: string
  children: React.ReactNode
  onSuccessText?: string
  onFailText?: string
  disabled?: boolean
}

const ClipboardCopyWrapper = ({
  textToCopy,
  children,
  onSuccessText,
  onFailText,
  disabled,
}: Props) => {
  const { t } = useTranslate('avoin-map')
  const notify = useUIStore((state) => state.notify)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      const text = onSuccessText || t('general.messages.clipboard_success')
      notify({ message: text, variant: 'info' })
    } catch (err) {
      const text = onFailText || t('general.messages.clipboard_fail')
      notify({ message: text, variant: 'error' })
    }
  }

  return <Box onClick={copyToClipboard}>{children}</Box>
}

export default ClipboardCopyWrapper
