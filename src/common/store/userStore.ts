import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { User } from '#/common/types/state'

interface Vars {
  user: User | null
  signOutActions: Record<string, () => void>
}

interface Actions {
  setUser: (user: User | null) => void
  addSignOutAction: (key: string, action: () => void) => void
  removeSignOutAction: (key: string) => void
}

type State = Vars & Actions

export const useUserStore = create<State>()(
  immer((set, get) => {
    const vars: Vars = {
      user: null,
      signOutActions: {},
    }

    const actions: Actions = {
      setUser: (user: User | null) => {
        set((state) => {
          state.user = user
        })
      },
      addSignOutAction: (key: string, action: () => void) => {
        set((state) => {
          state.signOutActions[key] = action
        })
      },
      removeSignOutAction: (key: string) => {
        if (get().signOutActions[key]) {
          set((state) => {
            delete state.signOutActions[key]
          })
        }
      },
    }

    return { ...vars, ...actions }
  })
)
