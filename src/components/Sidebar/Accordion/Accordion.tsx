import React from 'react'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Accordion as MuiAccordion, AccordionSummary, Typography, AccordionDetails, Theme } from '@mui/material'

const drawerWidth = 340

interface Props {
  item: any
  isDrawerItem?: boolean
}

const DrawerAccordion = ({ item, isDrawerItem }: Props) => {
  return (
    <MuiAccordion sx={isDrawerItem ? { marginBottom: 8, width: drawerWidth - 46, typography: 'body1' } : {}}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        {item?.title && (
          <Typography
            sx={{
              typography: 'h3',
            }}
          >
            {item.title}
          </Typography>
        )}
      </AccordionSummary>

      <AccordionDetails sx={{ padding: 0 }}>
        <Content item={item} />
      </AccordionDetails>
    </MuiAccordion>
  )
}

const Content = (props: any) => {
  const { item, checked } = props

  const ContentComponent = item.content
  return <ContentComponent checked={checked} item={item.content} />
}

export default DrawerAccordion
