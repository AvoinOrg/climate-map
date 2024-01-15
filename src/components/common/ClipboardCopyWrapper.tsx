import React from 'react'
import { Box } from '@mui/material'
import { useTranslate } from '@tolgee/react'

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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy)
      const text = onSuccessText || t('general.messages.clipboard_success')
      alert(text)
    } catch (err) {
      const text = onFailText || t('general.messages.clipboard_fail')
      alert(text)
    }
  }

  return <Box onClick={copyToClipboard}>{children}</Box>
}

export default ClipboardCopyWrapper
