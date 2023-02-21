import React from 'react'
import Feature from 'ol/Feature'
import { Table, TableBody, TableCell, TableRow, Box, styled } from '@mui/material'

import { gtkTurveVaratLuonnontilaisuusluokka } from './constants'

interface Props {
  features: Feature[]
}

const Popup = ({ features }: Props) => {
  const p = features[0].getProperties()

  return (
    <>
      <Table sx={{ width: '500px' }} size={'small'}>
        <TableBody>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>{p.suon_nimi}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Surveyed</TableCell>
            <TableCell>{p.tutkimusvuosi}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Area</TableCell>
            <TableCell>{p.suon_pinta_ala_ha}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Peat volume</TableCell>
            <TableCell>{p.suon_turvemaara_mm3}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>Average peat depth</TableCell>
            <TableCell>{p.turvekerroksen_keskisyvyys_m}</TableCell>
          </TableRow>
          <TableRow>
            <TableCell>
              Evaluation of how close the bog is to its natural state (class{' '}
              {p.luonnontilaisuusluokka === -1 ? '?' : p.luonnontilaisuusluokka} out of 5)
            </TableCell>
            <TableCell>{gtkTurveVaratLuonnontilaisuusluokka[p.luonnontilaisuusluokka]}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
      {p.photos_json && <PhotoContainer photoJson={p.photos_json} />}
    </>
  )
}

const PhotoContainer = ({ photoJson }: { photoJson: string }) => {
  const photos = JSON.parse(photoJson)

  return (
    <Box sx={{ overflow: 'scroll', maxHeight: '500px' }}>
      {photos.map((photo: any) => {
        const { kuva_id, kuvausaika, kuvaaja } = photo
        const imageURL = `https://gtkdata.gtk.fi/Turvevarojen_tilinpito/Turve_valokuvat/${kuva_id}.jpg`

        return (
          <p>
            <a target="_blank" href={imageURL}>
              <Photo src={imageURL} />
            </a>
            <br />
            Date: {kuvausaika.toLowerCase() === 'tuntematon' ? 'Unknown' : kuvausaika}
            <br />
            Photographer: {kuvaaja}
          </p>
        )
      })}
    </Box>
  )
}

const Photo = styled('img')({
  maxWidth: '400px',
  maxHeight: '300px',
})

export default Popup
