import { Button } from '@mui/material'
import { styled } from '@mui/material/styles'

import Sandwich from '../icons/Sandwich'
import { useUIStore } from '../../common/store'
import { SIDEBAR_CLOSED_WIDTH } from '#/common/style/theme/constants'

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
    <Button
      onClick={toggleSidebar}
      sx={(theme) => ({
        margin: '0 0 0 0',
        display: 'flex',
        '&:hover': {
          backgroundColor: 'transparent',
        },
        ...(!isSidebarOpen && { height: '110vh', alignItems: 'flex-start', width: SIDEBAR_CLOSED_WIDTH + 'px' }),
        ...sx,
      })}
      disableRipple={true}
      color="inherit"
      aria-label="open drawer"
      disabled={isSidebarDisabled}
      size="large"
    >
      {isSidebarOpen ? <MySandwich /> : <MySandwich sx={{ transform: 'rotate(90deg)', margin: '35px 2px 0 0' }} />}
    </Button>
  )
}

const MySandwich = styled(Sandwich)(({ theme }) => ({
  margin: '25px 0 0 25px',
  width: '80px',
  transition: 'transform 0.2s, margin 0.2s',
}))

export default SidebarToggleButton
