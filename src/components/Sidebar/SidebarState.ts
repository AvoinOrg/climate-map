import { observable } from 'micro-observables';

const sidebarState = observable<boolean>(true)

export const isOpenObservable = sidebarState.readOnly()

export const setVisible = visible => { sidebarState.set(visible) }
export const toggleSidebar = () => {
  sidebarState.set(!isOpenObservable.get())
}
