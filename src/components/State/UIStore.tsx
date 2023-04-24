import { useState, useRef } from 'react'
import { create } from 'zustand'

import { ProfileState, ModalState, NotificationMessage } from '#/common/types/state'

interface UIState {
  isSidebarOpen: boolean
  setIsSidebarOpen: (value: boolean) => void
  isSidebarDisabled: boolean
  setIsSidebarDisabled: (value: boolean) => void
  isMapPopupOpen: boolean
  setIsMapPopupOpen: (value: boolean) => void
  profileState: ProfileState
  setProfileState: (value: ProfileState) => void
  modalState: ModalState
  setModalState: (value: ModalState) => void
  signupFunnelStep: number
  setSignupFunnelStep: (value: number) => void
  notifications: NotificationMessage[]
  notify: (message: NotificationMessage) => void
}

export const useUIStore = create<UIState>((set, get) => ({
  isSidebarOpen: true,
  setIsSidebarOpen: (value) => set({ isSidebarOpen: value }),
  isSidebarDisabled: false,
  setIsSidebarDisabled: (value) => set({ isSidebarDisabled: value }),
  isMapPopupOpen: false,
  setIsMapPopupOpen: (value) => set({ isMapPopupOpen: value }),
  profileState: 'none',
  setProfileState: (value) => set({ profileState: value }),
  modalState: 'none',
  setModalState: (value) => set({ modalState: value }),
  signupFunnelStep: 0,
  setSignupFunnelStep: (value) => set({ signupFunnelStep: value }),
  notifications: [],
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
}))
