import React from 'react'
import createStyles from '@mui/styles/createStyles'
import makeStyles from '@mui/styles/makeStyles'
import { AOAccordion } from '../AOAccordion'

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: '100%',
    },
  })
)

const FiZonationContent = () => (
  <div>
    <p>
      This layer comprises of the
      {}{' '}
      <a href="http://metatieto.ymparisto.fi:8080/geoportal/catalog/search/resource/details.page?uuid=%7B8E4EA3B2-A542-4C39-890C-DD7DED33AAE1%7D">
        Zonation 2018 data (forests of high biodiversity value)
      </a>
      .
      <br />
      The data shown corresponds to 10% of the most important areas for biodiversity in Finland.
    </p>
  </div>
)

const BiodiversityContent = () => {
  const classes = useStyles({})
  return (
    <div className={classes.root}>
      <AOAccordion layerId={'metsaan_ete_basic'} label={'Potential METSO areas'} content={null} />
      <AOAccordion layerId={'metsaan_ete_important'} label={'Especially Important Habitats'} content={null} />
      <AOAccordion layerId={'zonation6'} label={'Areas important to biodiversity'} content={<FiZonationContent />} />
      <AOAccordion layerId={'natura2000'} label={'Natura 2000'} content={null} />
    </div>
  )
}

export default BiodiversityContent
