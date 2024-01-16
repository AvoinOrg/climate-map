import React from 'react'
import { SnackbarProvider } from 'notistack'

import NotificationManager from './NotificationManager'

type Props = {
  children: React.ReactNode
}

const NotificationProvider = ({ children }: Props) => {
  return (
    <SnackbarProvider
      maxSnack={3}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      // Components={{
      //   reportComplete: ReportCompleteSnackbar,
      // }}
    >
      <NotificationManager />
      {children}
    </SnackbarProvider>
  )
}

export default NotificationProvider
