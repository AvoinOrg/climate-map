import { useState, useEffect } from 'react';
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

import { PlanConf } from '../types'

interface AppState {
  planConfs: PlanConf[]
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      planConfs: [],
    }),
    {
      name: 'food-storage', // name of item in the storage (must be unique)
      storage: createJSONStorage(() => sessionStorage), // (optional) by default the 'localStorage' is used
    }
  )
)
