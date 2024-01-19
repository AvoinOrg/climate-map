import React from 'react'
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import {
  ConfirmationDialogOptions,
  InternalConfirmationDialogOptions,
  InternalNotificationMessage,
  NotificationMessage,
} from '#/common/types/state'
import { generateUUID } from '../utils/general'

interface Vars {
  isSidebarOpen: boolean
  isSidebarDisabled: boolean
  mode: 'side' | 'full'
  isMapPopupOpen: boolean
  notifications: Record<string, InternalNotificationMessage>
  isNavbarOpen: boolean
  isLoginModalOpen: boolean
  sidebarWidth: number | undefined
  confirmationDialogOptions: InternalConfirmationDialogOptions
}

interface Actions {
  setIsSidebarOpen: (value: boolean) => void
  setMode: (value: 'side' | 'full') => void
  setIsSidebarDisabled: (value: boolean) => void
  setIsMapPopupOpen: (value: boolean) => void
  notify: (notification: NotificationMessage) => Promise<void>
  updateNotification: (
    notificationId: string,
    notification: Partial<InternalNotificationMessage>
  ) => Promise<void>
  setIsNavbarOpen: (value: boolean) => void
  setSidebarHeaderElement: undefined | ((value: React.JSX.Element) => void)
  setSidebarHeaderElementSetter: (
    setter: (value: React.JSX.Element) => void
  ) => void
  setIsLoginModalOpen: (isOpen: boolean) => void
  setSidebarWidth: (pixels: number) => void
  triggerConfirmationDialog: (
    options: ConfirmationDialogOptions
  ) => Promise<void>
}

type State = Vars & Actions

export const useUIStore = create<State>()(
  immer((set, get) => {
    const vars: Vars = {
      isSidebarDisabled: false,
      isSidebarOpen: true,
      mode: 'side',
      isMapPopupOpen: false,
      isLoginModalOpen: false,
      isNavbarOpen: true,
      notifications: {},
      sidebarWidth: undefined,
      confirmationDialogOptions: { id: null },
    }
    const actions: Actions = {
      setIsSidebarOpen: (value) => set({ isSidebarOpen: value }),
      setMode: (value) => set({ mode: value }),
      setIsSidebarDisabled: (value) => set({ isSidebarDisabled: value }),
      setIsMapPopupOpen: (value) => set({ isMapPopupOpen: value }),
      setIsLoginModalOpen: (isOpen: boolean) => {
        set({ isLoginModalOpen: isOpen })
      },
      // profileState: 'none',
      // setProfileState: (value) => set({ profileState: value }),
      // modalState: 'none',
      // setModalState: (value) => set({ modalState: value }),
      // signupFunnelStep: 0,
      // setSignupFunnelStep: (value) => set({ signupFunnelStep: value }),
      setIsNavbarOpen: (value) => set({ isNavbarOpen: value }),
      // These two allow dynamic changing of the sidebar header from other components
      // TODO: Figure out a better way to do this
      setSidebarHeaderElement: undefined,
      setSidebarHeaderElementSetter: (setter) =>
        set({ setSidebarHeaderElement: setter }),
      setSidebarWidth(pixels: number) {
        set({ sidebarWidth: pixels })
      },
      notify: async (notification: NotificationMessage) => {
        const newNotification: InternalNotificationMessage = {
          id: generateUUID(),
          message: notification.message,
          variant: notification.variant,
          duration: notification.duration || 6000,
          triggeredTs: new Date().getTime(),
          shown: false,
        }

        await set((state) => {
          state.notifications[newNotification.id] = newNotification
        })
      },
      updateNotification: async (
        notificationId: string,
        notification: Partial<InternalNotificationMessage>
      ) => {
        const { notifications } = get()

        const oldNotification = notifications[notificationId]

        if (oldNotification == null) {
          console.error("Can't update a notification that does not exist")
          return
        }
        const updatedNotification = { ...oldNotification, ...notification }
        await set((state) => {
          state.notifications[notificationId] = updatedNotification
        })
      },
      triggerConfirmationDialog: async (options: ConfirmationDialogOptions) => {
        const newOptions = { ...options, id: generateUUID() }
        await set((state) => {
          state.confirmationDialogOptions = newOptions
        })
      },
    }

    return { ...vars, ...actions }
  })
)
