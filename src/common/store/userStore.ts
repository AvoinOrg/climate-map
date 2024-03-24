import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'

import { User } from '#/common/types/state'

interface Vars {
  user: User | null
}

interface Actions {
  setUser: (user: User | null) => void
}

type State = Vars & Actions

export const useUserStore = create<State>()(
  immer((set, get) => {
    const vars: Vars = {
      user: null,
    }

    const actions: Actions = {
      setUser: (user: User | null) => {
        set((state) => {
          state.user = user
        })
      },
    }

    return { ...vars, ...actions }
  })
)
