import React from 'react'
import { Box } from '@mui/material'
import { styled } from '@mui/material/styles'
import { AOAccordionLink, AOAccordion } from '#/components/Sidebar/Accordion'

const LegendBox = (props: any) => {
  return (
    <span>
      <Box
        sx={{
          backgroundColor: props.color,
          border: '1px solid black',
          width: '1rem',
          height: '1rem',
          margin: '0 5px -2px 0',
          display: 'inline-block',
        }}
      ></Box>
      {props.title}
    </span>
  )
}

const MatureForestContent = () => (
  <InfoContainer>
    <p>This layer shows forests that have reached the approximate threshold for regeneration felling.</p>
    Legend:
    <Legend id="legend-mature-forests">
      <LegendBox color="rgba(73, 25, 2320, 0.65)" title="Mature forest" />
      <LegendBox color="rgba(206, 244, 66, 0.35)" title="Other forest" />
    </Legend>
  </InfoContainer>
)

const MangroveForestContent = () => (
  <InfoContainer>
    <p>
      This layer shows mangrove forests monitored by
      {} <a href="https://www.globalmangrovewatch.org/about/">the Global Mangrove Watch</a>.
    </p>
    <p>The data shown here is from 2010.</p>
  </InfoContainer>
)

const TropicalForestContent = () => (
  <InfoContainer>
    <p>
      <a href="https://www.globalforestwatch.org/">the Global Forest Watch</a>
      {} tree plantations data from combined with
      {} <a href="https://www.cifor.org/">CIFOR data</a> of global wetlands.
    </p>
    <p>Green areas area forest plantations that are on mineral soil and brown areas those in peatlands.</p>
    <p>
      Click on a forest plantation to view more information and estimated emission reduction potentials of peatland
      forest plantations when the groundwater level is lifted by 40 cm.
    </p>
  </InfoContainer>
)

const ForestCoverageContent = () => (
  <InfoContainer>
    <p>
      <a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">
        Hansen/UMD/Google/USGS/NASA
      </a>
      {} global forest change data.
    </p>
    <p>
      Shows global forest coverage from year 2000, forest cover loss from years 2000-2020, and forest cover gain from
      years 2000-2012.
    </p>
    Legend:
    <Legend id="legend-forest-coverage">
      <LegendBox color="green" title="Forest coverage (2000)" />
      <LegendBox color="red" title="Forest coverage loss (2000-2020)" />
      <LegendBox color="blue" title="Forest coverage gain (2000-2012)" />
      <LegendBox color="purple" title="Both gain (2000-2020) and loss (2000-2012)" />
    </Legend>
  </InfoContainer>
)

const ForestContent = () => {
  return (
    <Box sx={{ width: '100%' }}>
      <AOAccordionLink href="/app/fi-forest" label={"Finland's Forests"} />
      <AOAccordion layerId={'hansen'} label={'Global forest coverage'} content={<ForestCoverageContent />} />
      <AOAccordion layerId={'fi_mature_forests'} label={'Mature Forests'} content={<MatureForestContent />} />
      <AOAccordion layerId={'mangrove_forests'} label={'Mangrove forests'} content={<MangroveForestContent />} />
      <AOAccordion layerId={'gfw_tree_plantations'} label={'Tree plantations'} content={<TropicalForestContent />} />
    </Box>
  )
}

const InfoContainer = styled(Box)({
  // TODO: figure out why this does not work
  '&p:first-of-type': {
    marginTop: 0,
  },
})

const Legend = styled('legend')({
  display: 'flex',
  flexDirection: 'column',
  padding: '6px 0 0 0',
})

export default ForestContent
