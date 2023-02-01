'use client'

import React, { createContext, useState, useRef } from 'react'
import { observable } from 'micro-observables'
import { useObservable } from 'micro-observables'
import { Box } from '@mui/material'
import { Snackbar } from '@mui/material'
import MuiAlert from '@mui/material/Alert'

import { ProfileState, ModalState } from '#/types/state'

const Notification = (props: any) => {
  const [open, setOpen] = useState(true)

  const handleClose = (event?: React.SyntheticEvent, reason?: string) => {
    if (reason === 'clickaway') {
      return
    }
    setOpen(false)
  }

  return (
    <Snackbar open={open} autoHideDuration={props.duration} onClose={handleClose}>
      <MuiAlert elevation={6} variant="filled" onClose={handleClose} severity={props.severity}>
        {props.message}
      </MuiAlert>
    </Snackbar>
  )
}

export const UiStateContext = createContext({})

export const UiStateProvider = (props: any) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isSidebarDisabled, setIsSidebarDisabled] = useState(false)
  const [profileState, setProfileState] = useState<ProfileState>('none')
  const [modalState, setModalState] = useState<ModalState>('none')
  // const [profileMessage, setProfileMessage] = useState(null);
  const [signupFunnelStep, setSignupFunnelStep] = useState(0)
  const [notifications, setNotifications] = useState<any>({})

  const notificationsRef = useRef(notifications)
  notificationsRef.current = notifications

  const notify = (message: any, severity: any, duration = 6000) => {
    const newNotification: any = {}
    const index = new Date().getTime()

    newNotification[index] = {
      message,
      severity,
      duration,
    }

    setNotificationTimeout(index, duration + 1000)

    setNotifications((notifications: any) => {
      return { ...notifications, ...newNotification }
    })
  }

  const setNotificationTimeout = (index: number, timeout: number) => {
    setTimeout(async () => {
      const newNotifications: any = { ...notificationsRef.current }
      delete newNotifications[index]
      setNotifications(newNotifications)
    }, timeout)
  }

  const handleSetModalState = (state: ModalState) => {
    setModalState(state)
    setIsSidebarDisabled(state !== 'none')
  }

  const handleSetProfileState = (state: ProfileState) => {
    setProfileState(state)

    if (state !== 'none') {
      setModalState('profile')
    } else {
      setModalState('none')
    }

    setIsSidebarDisabled(state !== 'none')
  }

  const values = {
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarDisabled,
    setIsSidebarDisabled,
    profileState,
    setProfileState: handleSetProfileState,
    modalState,
    setModalState: handleSetModalState,
    signupFunnelStep,
    setSignupFunnelStep,
    notifications,
    notify,
    // profileMessage,
    // setProfileMessage,
  }

  return (
    <UiStateContext.Provider value={values}>
      {props.children}
      <Box
        sx={(theme) => ({
          width: '100%',
          zIndex: 3000,
          '& > * + *': {
            marginTop: theme.spacing(2),
          },
        })}
      >
        {Object.keys(notifications).map((key) => {
          return (
            <Notification
              key={key}
              message={notifications[key].message}
              severity={notifications[key].severity}
              duration={notifications[key].duration}
            />
          )
        })}
      </Box>
    </UiStateContext.Provider>
  )
}
