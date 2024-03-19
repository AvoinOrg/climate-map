'use client'

import React from 'react'
import { Box, Button, Typography } from '@mui/material'
import { styled } from '@mui/material/styles'
import { T } from '@tolgee/react'
import { useRouter } from 'next/navigation'

import { getRoute } from '#/common/utils/routing'
import Link from '#/components/common/Link'
import { useMapStore } from '#/common/store'
import { ClickableModal } from '#/components/Modal'

import { routeTree } from 'applets/hiilikartta/common/routes'
import { NewPlanConf, PlanData, ZONING_CODE_COL } from '../../common/types'
import { useAppletStore } from '../../state/appletStore'
import { createLayerConf } from '../../common/utils'

const Page = () => {
  const router = useRouter()

  const addPlanConf = useAppletStore((state) => state.addPlanConf)
  const deletePlanConf = useAppletStore((state) => state.deletePlanConf)
  const addSerializableLayerGroup = useMapStore(
    (state) => state.addSerializableLayerGroup
  )

  const initializePlan = async () => {
    const colName = ZONING_CODE_COL
    const jsonName = 'Uusi kaava'
    const data: PlanData = {
      type: 'FeatureCollection',
      features: [],
    }

    const newPlanConf: NewPlanConf = {
      data: data,
      name: jsonName,
      areaHa: 0,
    }

    const planConf = await addPlanConf(newPlanConf)

    try {
      const layerConf = createLayerConf(data, planConf.id, colName)
      await addSerializableLayerGroup(layerConf.id, {
        layerConf,
        persist: false,
      })
    } catch (e) {
      deletePlanConf(planConf.id)
      console.error(e)
      return null
    }

    return planConf.id
  }

  const handleNewPlanClick = async () => {
    const id = await initializePlan()
    // TODO: throw error if id is null, i.e. if file is invalid
    if (id) {
      const route = getRoute(routeTree.plans.plan, routeTree, {
        routeParams: {
          planId: id,
        },
      })
      router.push(route)
    }
  }

  return (
    <>
      <Link
        href={getRoute(routeTree.create.import, routeTree)}
        sx={{ display: 'flex', color: 'inherit', textDecoration: 'none' }}
      >
        <BigMenuButton variant="contained" component="label">
          <T keyName={'sidebar.create.upload'} ns={'hiilikartta'}></T>
        </BigMenuButton>
      </Link>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          mr: 1,
          mt: 2,
        }}
      >
        <ClickableModal
          modalBody={
            <Box>
              <Typography sx={{ typography: 'body2' }}>
                Hiilikarttaan tuotava kaavatiedosto tulee olla joko Esrin
                Shapefile- tai avoimen lähdekoodin GeoPackage-muodossa.
                Shapefile-tiedoston osaset tulee olla pakattuna yhdeksi
                zip-tiedostoksi. Varmista, että aineistolle on määritelty
                koordinaattijärjestelmä. Suositeltu koordinaattijärjestelmä on
                ETRS-TM35FIN (ESPG:3067), mutta hiilikartta osaa lukea myös
                muita koordinaattijärjestelmiä. Voit tarkastaa, että aineisto
                aukeaa oikein esim. QGIS-ohjelmistossa.
                <br /> <br /> Kaavan vaikutusten laskenta Hiilikartassa perustuu
                käyttötarkoitusluokkiin. Kaava-aineistoon voi tehdä valmiiksi
                käyttötarkoitusluokituksen, jota Hiilikartta käyttää tai kaavaa
                tuotaessa pitää kaavakohteittain kertoa, mihin Hiilikartan
                luokkaan kaavakohde kuuluu. Hiilikartan käyttämät
                käyttötarkoitusluokat ja niiden lyhenteet on esitetty alla
                olevassa taulukossa. Paikkatietoaineistoon voidaan tehdä uusi
                sarake ja koodata siihen taulukossa esitetty
                käyttötarkoitusluokan lyhenne. Kun kaava tuodaan työkaluun,
                kerrotaan mistä sarakkeesta koodattu käyttötarkoitusluokan
                lyhenne löytyy.
              </Typography>
            </Box>
          }
        >
          <Typography
            sx={{
              display: 'inline',
              color: 'neutral.dark',
              typography: 'body2',
            }}
          >
            <T
              ns="hiilikartta"
              keyName={'sidebar.create.show_instructions'}
            ></T>
          </Typography>
        </ClickableModal>
      </Box>

      <BigMenuButton
        sx={{ mt: 5 }}
        variant="contained"
        onClick={handleNewPlanClick}
      >
        <T keyName={'sidebar.create.draw_new'} ns={'hiilikartta'}></T>
      </BigMenuButton>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-end',
          mr: 1,
          mt: 2,
        }}
      >
        <ClickableModal
          modalBody={
            <Box>
              <Typography sx={{ typography: 'body2' }}>
                Aloita uuden kaavan piirtäminen valitsemalla piirtotyökalu
                kartan yläreunasta. Zoomaa karttaa haluamallesi alueelle ja
                aloita piirtäminen klikkaamalla karttaa. Piirrä monikulmio ja
                lopeta piirtäminen tuplaklikkaamalla. Voit muokata piirtämiäsi
                kohteita siirtämällä kulmapisteitä. Voit lisätä uusia
                kulmapisteitä tuplaklikkaamalla aluerajaa. Voit deletoida
                valitun karttakohteen yläreunan roskakori-kuvakkeen avulla tai
                painamalla näppäimistöstä del. Lisää piirtämillesi alueille
                aluetiedot ruudun vasemman reunan valikosta. Jos aluekohteille
                ei lisää mitään käyttötarkoitusluokkaa, niin Hiilikartta olettaa
                että koko alue muuttuu rakennetuksi ja hiilivarasto poistuu. Kun
                kaikki alueet on piirretty ja halutut aluetiedot lisätty voit
                painaa “laske vaikutukset hiilivarastoon”.
              </Typography>
            </Box>
          }
        >
          <Typography
            sx={{
              display: 'inline',
              color: 'neutral.dark',
              typography: 'body2',
            }}
          >
            <T
              ns="hiilikartta"
              keyName={'sidebar.create.show_instructions'}
            ></T>
          </Typography>
        </ClickableModal>
      </Box>
    </>
  )
}

const BigMenuButton = styled(Button)<{ component?: string }>({
  width: '100%',
  height: '60px',
  margin: '0 0 0 0',
})

export default Page
