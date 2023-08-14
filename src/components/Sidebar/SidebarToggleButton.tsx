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
        p: 3,
        pl: 5,
        display: 'flex',
        '&:hover': {
          backgroundColor: 'transparent',
        },
        ...(!isSidebarOpen && {
          height: '100vh',
          alignItems: 'flex-start',
          width: SIDEBAR_CLOSED_WIDTH + 'px',
          p: 0,
          pl: 0,
        }),
        transition: 'padding 0.1s',
        ...sx,
      })}
      disableRipple={true}
      color="inherit"
      aria-label="open drawer"
      disabled={isSidebarDisabled}
      size="large"
    >
      {isSidebarOpen ? <MySandwich /> : <MySandwich sx={{ transform: 'rotate(90deg)', margin: '35px 0 0 0' }} />}
    </Button>
  )
}

const MySandwich = styled(Sandwich)(({ theme }) => ({
  margin: '0',
  width: '50px',
  transition: 'transform 0.1s, margin 0.1s',
}))

export default SidebarToggleButton
