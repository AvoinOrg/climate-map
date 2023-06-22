import { useContext } from 'react'
import { IconButton } from '@mui/material'

import HamburgerClosed from '../icons/HamburgerClosed'
import HamburgerOpen from '../icons/HamburgerOpen'
import { useUIStore } from '../../common/store'

interface Props {
  sx?: any
}

const SidebarToggleButton = ({ sx }: Props) => {
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen)
  const setIsSidebarOpen = useUIStore((state) => state.setIsSidebarOpen)
  const isSidebarDisabled = useUIStore((state) => state.isSidebarDisabled)

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  return (
    <IconButton
      onClick={toggleSidebar}
      edge="start"
      sx={(theme) => ({
        padding: '0',
        width: '30px',
        margin: '0 0 0 0',
        display: 'flex',
        ...sx,
      })}
      disableRipple
      color="inherit"
      aria-label="open drawer"
      disabled={isSidebarDisabled}
      size="large"
    >
      {isSidebarOpen ? <HamburgerOpen /> : <HamburgerClosed sx={{ width: '80px' }} />}
    </IconButton>
  )
}

export default SidebarToggleButton
