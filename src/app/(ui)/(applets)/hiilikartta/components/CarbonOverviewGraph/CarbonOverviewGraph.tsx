import React, { useState } from 'react'
import { styled } from '@mui/material/styles'
import {
  Box,
  SxProps,
  Theme,
  Typography,
  SelectChangeEvent,
} from '@mui/material'
import { T } from '@tolgee/react'

import { pp } from '#/common/utils/general'
import DropDownSelectMinimal from '#/components/common/DropDownSelectMinimal'
import { ClickableModal } from '#/components/Modal'

import { PlanConfWithReportData } from 'applets/hiilikartta/common/types'
import GeomGraphic from './GeomGraphic'
import CarbonChangeLegend from '../CarbonChangeLegend'
import { Info } from '#/components/icons'

type Props = {
  planConfs: PlanConfWithReportData[]
  featureYears: string[]
  sx?: SxProps<Theme>
}

const CarbonOverviewGraph = ({ planConfs, featureYears, sx }: Props) => {
  const [activeYear, setActiveYear] = useState(featureYears[1])

  const handleYearChange = (event: SelectChangeEvent<string>) => {
    setActiveYear(event.target.value)
  }

  return (
    <Box sx={[...(Array.isArray(sx) ? sx : [sx])]}>
      <Row>
        <Col>
          <Row sx={{ justifyContent: 'flex-start' }}>
            <Typography
              sx={(theme) => ({
                typography: theme.typography.h1,
                display: 'inline',
              })}
            >
              <T
                keyName="report.overview_graph.impact_on_carbon_stock"
                ns={'hiilikartta'}
              ></T>{' '}
            </Typography>
            {/* <Info
              sx={{
                height: '1.1rem',
                mt: 'auto',
                mb: '0.28rem',
                ml: '0.85rem',
              }}
            ></Info> */}
          </Row>
          <Row sx={{ justifyContent: 'flex-start', mt: 0.5 }}>
            <Typography
              sx={(theme) => ({
                typography: theme.typography.h1,
                display: 'inline',
              })}
            >
              <T keyName="report.overview_graph.on_year" ns={'hiilikartta'}></T>{' '}
            </Typography>
            <DropDownSelectMinimal
              options={featureYears.map((featureYear) => ({
                label: featureYear,
                value: featureYear,
              }))}
              value={activeYear}
              onChange={handleYearChange}
              optionSx={{
                typography: 'h1',
                display: 'inline',
              }}
              iconSx={{
                mt: 0.2,
                height: '0.75rem',
              }}
            ></DropDownSelectMinimal>
          </Row>
        </Col>
      </Row>
      <Row
        sx={{
          mt: 3,
          mb: 5,
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          gap: '1.75rem',
        }}
      >
        {planConfs.map((planConf) => {
          return (
            <Row
              sx={{
                flex: { xs: 1, md: 0.5 },
                maxWidth: '500px',
                border: '1px solid',
                borderRadius: '0.3125rem',
                borderColor: 'primary.dark',
                pt: '2rem',
                pb: '2rem',
                pl: '1.75rem',
                pr: '1.75rem',
                boxShadow: '1px 1px 4px 1px rgba(217, 217, 217, 0.50);',
              }}
              key={planConf.serverId}
            >
              <Col>
                <Typography typography={'h8'}>
                  <T keyName="report.overview_graph.plan" ns="hiilikartta"></T>
                </Typography>
                <Typography
                  typography={'h7'}
                  sx={{
                    display: 'inline',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    maxWidth: '250px',
                  }}
                >
                  {planConf?.name}
                </Typography>
                <Typography typography={'h5'} sx={{ mt: 2 }}>
                  <T
                    keyName="report.overview_graph.carbon_stock_decreases"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={4} typography={'h5'}>
                  <T
                    keyName="report.overview_graph.carbon_eqv_unit"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={1} typography={'h1'}>
                  {pp(
                    planConf.reportData.agg.totals.bio_carbon_total_diff[
                      activeYear
                    ] +
                      planConf.reportData.agg.totals.ground_carbon_total_diff[
                        activeYear
                      ],
                    0
                  )}
                </Typography>
                <Typography mt={3} typography={'h5'}>
                  <T
                    keyName="report.overview_graph.carbon_eqv_unit_hectare"
                    ns="hiilikartta"
                  ></T>
                </Typography>
                <Typography mt={1} typography={'h1'}>
                  {pp(
                    planConf.reportData.agg.totals.bio_carbon_ha_diff[
                      activeYear
                    ] +
                      planConf.reportData.agg.totals.ground_carbon_ha_diff[
                        activeYear
                      ],
                    0
                  )}
                </Typography>
              </Col>
              <Col sx={{ ml: 2 }}>
                <GeomGraphic
                  calcFeatures={planConf.reportData.areas}
                  year={activeYear}
                  width={120}
                  height={200}
                  sx={{ mt: 3 }}
                ></GeomGraphic>
              </Col>
            </Row>
          )
        })}
      </Row>
      <CarbonChangeLegend></CarbonChangeLegend>
      <Col sx={{ alignItems: 'flex-end', mt: 2 }}>
        <ClickableModal
          modalBody={
            <Typography typography="body2">
              Työkalu laskee kasvillisuuden ja maaperän hiilivaraston nykyisen
              hiilivaraston paikkatietoaineistojen perusteella. Arvot on
              esitetty hiilidioksiditonneina (t CO2). Kaavan vaikutus
              hiilivarastoon perustuu kasvillisuuden ja maaperän nykyiseen
              hiilivarastoon, kasvupaikkatyyppin perustuvaan arvioon
              kasvillisuuden hiilen sidonnasta tai päästöistä, käyttäjän
              syöttämiin kaavan aluevaraustietoihin ja niihin liittyviin
              oletuksiin hiilivaraston säilymisestä eri käyttötarkoitusluokissa.
              Arvio puuston hiilivaraston kehityksestä tiettyyn vuoteen mennessä
              perustuu kasvupaikan luokituksiin. <br />
              <br /> Työkalun avulla voidaan vertailla useamman kaavavaihtoehdon
              vaikutuksia hiilivarastoon. Jos vaihtoehdoilla on erilainen
              alueellinen kattavuus, vaihtoehdot eroavat sekä ilman kaavaa
              olevan tilanteen että kaavan toteutumisen myötä syntyneen
              tilanteen osalta. Jos vaihtoehtojen alueellinen kattavuus on sama,
              mutta vaihtoehdot eroavat aluevarusten luokituksen osalta,
              hiilivaraston suuruus ja kehitys ilman kaavaa on molemmissa
              vaihtoehdoissa sama ja kaavat eroavat vain kaavan vaikutusten
              osalta. <br />
              <br /> Tiedot kasvillisuuden hiilivarastosta on koostettu eri
              lähteistä. Metsämaan osalta tiedot perustuvat monilähteisen
              valtakunnan metsien inventoinnin (MVMI) puuston
              biomassateemakarttoihin vuodelta 2021. Maatalousmaan osalta tiedot
              perustuvat YASSO laskentoihin, ELY-keskuskohtaisiin satotietoihin
              2012 – 2021 ja kuntakohtaiseen viljelypinta-alaan vuonna 2021.
              Maatalousmaan rajaus perustuu Maanmittauslaitoksen, Ruokaviraston
              ja Syken tuottamaan aineistoon. Rakennetun ympäristön
              kasvillisuuden osalta hiilivaraston määrä on karkeampi arvio, joka
              perustuu kirjallisuuden, paikkatietoaineistojen ja
              asiantuntija-arvioiden perusteella määriteltyihin oletusarvoihin
              eri korkeusluokkien kasvillisuuden keskimääräisestä
              hiilivarastosta. <br />
              <br /> Tiedot maaperän hiilivarastosta koostettiin useasta eri
              aineistosta. Turvemaiden osalta hyödynnettiin suoallaskohtaista
              turpeen hiilivarastoaineistoa GTK:n tutkimille soille (n. 2,3
              milj. ha), sekä GTK:n valtakunnallisen ravintiesuustaso -aineiston
              ja siihen liitettyjen oletusarvojen (Korhonen 2013) perusteella.
              Turvemaiden ulkopuolelle jäävän metsämaan osalta maaperän
              hiilivarasto määriteltiin Luonnonvarakeskuksen MVMI
              Kasvupaikkatyyppiaineiston, sekä siihen liitettyjen oletusarvojen
              perusteella. Turvemaiden ulkopuolelle jäävän maatalousmaan osalta
              hiilivarasto määriteltiin Suomen ympäristökeskuksen,
              Maanmittauslaitoksen ja Ruokaviraston aineistoihin perustuvaan
              maatalousmaa-aineistoon ja siihen liitettyihin oletusarvoihin.
              Rakennetun alueen osalta maaperän hiilivarasto määriteltiin Syken
              ja Scalgon tuottaman 2m maankäyttöaineiston korkean ja matalan
              kasvillisuuden luokille tutkimuskirjallisuuden perusteella ja
              yleistettiin 16 m x 16 m hilaan. <br />
              <br /> Puuston hiilivaraston kehityksen laskennan perustana on
              metsien inventoinnin (MVMI) aineistoihin pohjautuva
              metsäíkköalueaineisto, jossa on luokiteltu kasvupaikan ja puuston
              ominaisuuksien perusteella mahdollisimman yhtenäisiä
              metsikköalueita. Alueita määrittäviä luokkamuuttajia ovat
              sijaintimaakunta, maaluokka (metsä-, kitu- ja joutomaa), päätyyppi
              (kivennäismaa, räme, korpi ja avosuo), ojitustilanne (ojitettu ja
              ojittamaton), ravinteisuustaso (lehdoista karukkokankaisiin),
              pääpuulaji (mänty, kuusi, koivu ja muu lehtipuu) ja puuston
              keski-ikä. Luokkamuuttujien perusteella metsikköalue yhdistetään
              Luonnonvarakeskuksen tuottamiin biomassakäyriin, jotka kuvaavat
              biomassan ja sen sisältämän hiilen kehitystä kyseisen tyyppisellä
              kasvupaikalla ajan funktiona. Biomassakäyrien pohjana toimii
              Luonnonvarakeskuksen Motti-ohjelmistolla tuotettu aineisto.
            </Typography>
          }
        >
          <Typography sx={{ display: 'inline', typography: 'body2' }}>
            <u>
              <T
                ns="hiilikartta"
                keyName="report.general.read_more_about_calc"
              ></T>
            </u>
          </Typography>
        </ClickableModal>
      </Col>
    </Box>
  )
}

export default CarbonOverviewGraph

const Row = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  width: '100%',
}))

const Col = styled('div')(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  width: '100%',
}))
