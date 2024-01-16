import React, { useEffect } from 'react'
import { SnackbarProvider, useSnackbar } from 'notistack'
import { useUIStore } from '#/common/store'

type Props = {
  children: React.ReactNode
}

const NotificationProvider = ({ children }: Props) => {
  const { enqueueSnackbar } = useSnackbar()
  const notifications = useUIStore((state) => state.notifications)
  const updateNotification = useUIStore((state) => state.updateNotification)

  useEffect(() => {
    if (notifications != null) {
      Object.values(notifications).forEach((notification) => {
        if (!notification.shown) {
          updateNotification(notification.id, { shown: true })
          enqueueSnackbar(notification.message, {
            variant: notification.variant,
          })
        }
      })
    }
  }, [notifications])

  return (
    <SnackbarProvider
      maxSnack={3}
      // Components={{
      //   reportComplete: ReportCompleteSnackbar,
      // }}
    >
      {children}
    </SnackbarProvider>
  )
}

export default NotificationProvider
