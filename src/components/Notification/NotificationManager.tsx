import React, { useEffect } from 'react'
import { useSnackbar } from 'notistack'

import { useUIStore } from '#/common/store'

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
          })
        }
      })
    }
  }, [notifications])

  return <></>
}

export default NotificationManager
