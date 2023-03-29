import { create } from 'zustand'

import { PlanConf } from '../types'

interface AppState {
  planConfs: PlanConf[]
}

export const useStore = create<AppState>((set) => ({
  planConfs: [],
}))
