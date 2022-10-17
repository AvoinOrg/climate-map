import React, { useContext, useEffect, useState } from 'react'
import { Theme } from '@mui/material'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'

import { AOAccordionLink } from 'Components/Sidebar/Accordion'
import { UserStateContext } from 'Components/State/UserState'

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: '100%',
    },
    text: {
      padding: '0 16px 0 16px',
      fontWeight: theme.typography['regular'].fontWeight,
    },
  })
)

const PrivateContent = () => {
  const classes = useStyles({})
  const { isLoggedIn, privateLayers }: any = useContext(UserStateContext)

  const [hasLayers, setHasLayers] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      for (const key in privateLayers) {
        if (privateLayers[key]) {
          !hasLayers && setHasLayers(true)
          return
        }
      }
    }

    setHasLayers(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, privateLayers])

  return (
    <div className={classes.root}>
      <p className={classes.text}>
        This panel shows all the private data you have access to.{' '}
        {!hasLayers && "You don't currently have access to any private data."}
      </p>
      {hasLayers && (
        <>
          {privateLayers['valio-carbon-grass-fields'] && (
            <AOAccordionLink href="/layers/valio-carbon-grass-fields" label={'Valio Carbon Grass Fields'} />
          )}
        </>
      )}
    </div>
  )
}

export default PrivateContent
