import React from 'react'
import { create } from 'zustand'

import { NotificationMessage } from '#/common/types/state'

interface Vars {
  isSidebarOpen: boolean
  isSidebarDisabled: boolean
  mode: 'side' | 'full'
  isMapPopupOpen: boolean
  notifications: NotificationMessage[]
  isNavbarOpen: boolean
  isLoginModalOpen: boolean
  sidebarWidth: number | undefined
}

interface Actions {
  setIsSidebarOpen: (value: boolean) => void
  setMode: (value: 'side' | 'full') => void
  setIsSidebarDisabled: (value: boolean) => void
  setIsMapPopupOpen: (value: boolean) => void
  notify: (message: NotificationMessage) => void
  setIsNavbarOpen: (value: boolean) => void
  setSidebarHeaderElement: undefined | ((value: React.JSX.Element) => void)
  setSidebarHeaderElementSetter: (setter: (value: React.JSX.Element) => void) => void
  setIsLoginModalOpen: (isOpen: boolean) => void
  setSidebarWidth: (pixels: number) => void
}

type State = Vars & Actions

export const useUIStore = create<State>((set, get) => {
  const vars: Vars = {
    isSidebarDisabled: false,
    isSidebarOpen: true,
    mode: 'side',
    isMapPopupOpen: false,
    isLoginModalOpen: false,
    isNavbarOpen: true,
    notifications: [],
    sidebarWidth: undefined,
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
    setSidebarHeaderElementSetter: (setter) => set({ setSidebarHeaderElement: setter }),
    setSidebarWidth(pixels: number) {
      set({ sidebarWidth: pixels })
    },
    notify: (message) => {
      const newNotification: any = {}
      const index = new Date().getTime()

      newNotification[index] = {
        message,
        severity: message.severity,
        duration: message.duration || 6000,
      }

      set((state) => ({
        notifications: { ...state.notifications, ...newNotification },
      }))

      setTimeout(async () => {
        const newNotifications: any = { ...get().notifications }
        delete newNotifications[index]
        set({ notifications: newNotifications })
      }, message.duration || 6000)
    },
  }

  return { ...vars, ...actions }
})
