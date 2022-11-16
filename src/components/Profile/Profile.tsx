import React, { useEffect } from 'react'
import { Theme } from '@mui/material/styles'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { Button } from '@mui/material'

import DataForm from './DataForm'
import IntegrationForm from './IntegrationForm'
import VerificationForm from './VerificationForm'
import FieldCarbon from './FieldCarbon'
import Login from './Login'
import { UserStateContext, UiStateContext } from '#/components/State'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      display: 'flex',
      justifyContent: 'center',
    },
    container: {
      overflow: 'auto',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '800px',
      padding: '150px 0 0 0',
    },
    header: {
      fontFamily: theme.typography.fontFamily[0],
      fontWeight: 500,
      textAlign: 'center',
      margin: '80px 0 0 0',
    },
    nextButton: {
      alignSelf: 'flex-end',
      margin: '60px 8px 0 8px',
    },
  })
)

const Profile = () => {
  const classes = useStyles({})
  const { userProfile, isLoggedIn }: any = React.useContext(UserStateContext)
  const { profileState, setProfileState }: any = React.useContext(UiStateContext)

  const handleClickNext = () => {
    setProfileState('dataIntegrate')
  }

  useEffect(() => {
    if (profileState === 'data') {
      if (userProfile && userProfile.funnelState > 1) {
        setProfileState('dataIntegrate')
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileState])

  return (
    <div className={classes.root}>
      <div className={classes.container}>
        {profileState === 'data' && isLoggedIn && <DataForm handleClickNext={handleClickNext}></DataForm>}
        {profileState === 'dataIntegrate' && isLoggedIn && <IntegrationForm></IntegrationForm>}
        {profileState === 'verification' && (
          <>
            <VerificationForm></VerificationForm>
            {!isLoggedIn && <Login></Login>}
          </>
        )}
        {profileState === 'fieldCarbon' && (
          <>
            <FieldCarbon></FieldCarbon>
          </>
        )}
      </div>
    </div>
  )
}

export const NextButton = (props) => {
  const classes = useStyles({})

  return (
    <Button
      variant={'contained'}
      disableElevation
      className={classes.nextButton}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      Next
    </Button>
  )
}

export default Profile
