import React, { useEffect, useMemo, useRef } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogTitle from '@mui/material/DialogTitle'

import { useUIStore } from '#/common/store'
import { useTranslate } from '@tolgee/react'
import { ConfirmationDialogOptions } from '#/common/types/state'
import { Typography } from '@mui/material'

const ConfirmationDialog = () => {
  const confirmationDialogOptions = useUIStore(
    (state) => state.confirmationDialogOptions
  )
  const confirmationDialogIdRef = useRef<string | null>(null)
  const [open, setOpen] = React.useState(false)
  const { t } = useTranslate('avoin-map')

  useEffect(() => {
    if (confirmationDialogOptions) {
      if (confirmationDialogIdRef.current != confirmationDialogOptions.id) {
        confirmationDialogIdRef.current = confirmationDialogOptions.id
        setOpen(true)
      } else if (confirmationDialogOptions.id == null && open) {
        setOpen(false)
      }
    }
  }, [confirmationDialogOptions])

  const localOptions: ConfirmationDialogOptions = useMemo(() => {
    const options = { ...confirmationDialogOptions }
    if (options.confirmText == null) {
      options.confirmText = t('components.confirmation_dialog.confirm')
    }
    if (options.cancelText == null) {
      options.cancelText = t('components.confirmation_dialog.cancel')
    }
    return options
  }, [confirmationDialogOptions])

  const handleAccept = () => {
    setOpen(false)
    if (localOptions.onConfirm) {
      localOptions.onConfirm()
    }
  }

  const handleCancel = () => {
    setOpen(false)
    if (localOptions.onCancel != null) {
      localOptions.onCancel()
    }
  }

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      {localOptions.title != null && (
        <DialogTitle id="alert-dialog-title">{localOptions.title}</DialogTitle>
      )}
      {localOptions.content != null && (
        <DialogContent>
          <DialogContentText
            sx={{ color: 'neutral.darker' }}
            id="alert-dialog-description"
          >
            {localOptions.content}
          </DialogContentText>
        </DialogContent>
      )}
      <DialogActions>
        <Button onClick={handleCancel} disableFocusRipple>
          <Typography sx={{ color: 'neutral.darker' }}>
            {localOptions.cancelText}
          </Typography>
        </Button>
        <Button onClick={handleAccept} autoFocus disableFocusRipple>
          <Typography sx={{ color: 'neutral.darker' }}>
            {localOptions.confirmText}
          </Typography>
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ConfirmationDialog
