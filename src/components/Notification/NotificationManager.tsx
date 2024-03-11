import React, { useEffect } from 'react'
import { closeSnackbar, useSnackbar } from 'notistack'

import { useUIStore } from '#/common/store'
import { Box } from '@mui/material'
import { Cross } from '../icons'

const NotificationManager = () => {
  const { enqueueSnackbar } = useSnackbar()
  const notifications = useUIStore((state) => state.notifications)
  const updateNotification = useUIStore((state) => state.updateNotification)

  useEffect(() => {
    if (notifications != null) {
      Object.values(notifications).forEach((notification) => {
        if (!notification.shown) {
          updateNotification(notification.id, { shown: true })
          enqueueSnackbar(notification.message, {
            variant: notification.variant || 'default',
            autoHideDuration: notification.duration || 5000,
            hideIconVariant: true,
            action: (key) => (
              <Box
                onClick={() => {
                  closeSnackbar(key)
                }}
                sx={{
                  height: '100%',
                  '&:hover': { cursor: 'pointer' },
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Cross sx={{ display: 'flex', height: '16px' }}></Cross>
              </Box>
            ),
          })
        }
      })
    }
  }, [notifications])

  return <></>
}

export default NotificationManager
