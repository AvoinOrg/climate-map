import React from 'react'

import { Box } from '#/common/style/theme'
import TText from '#/components/common/TText'
import {
  ENERGY_CERTIFICATE_CLASS_CODES,
  ENERGY_CERTIFICATE_CLASS_COLORS,
} from '../layers/energyCertificateLayerConf'
import EnergyCertificateClassControls from './EnergyCertificateClassControls'

const ACCORDION_TEXT_SX = {
  color: '#111111',
  fontSize: '0.625rem',
  fontWeight: 400,
  lineHeight: '1.125rem',
  letterSpacing: '0.1em',
}

const PolymorphicBox = Box as React.ElementType

const EnergyClassesAccordionContent = () => {
  const [showDefinitions, setShowDefinitions] = React.useState(false)

  return (
    <Box
      sx={{
        pt: '2.125rem',
        mx: '2rem',
        maxWidth: { mobile: 'none', desktop: '15.875rem' },
      }}
    >
      <EnergyCertificateClassControls
        sx={{
          mb: '2.75rem',
          ml: '-2rem',
          width: { mobile: 'calc(100% + 4rem)', desktop: '20.125rem' },
          maxWidth: 'calc(100% + 4rem)',
          flexWrap: { mobile: 'wrap', desktop: 'nowrap' },
          rowGap: { mobile: '0.5rem', desktop: 0 },
        }}
      />

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1.125rem',
        }}
      >
        <Box component="p" sx={{ ...ACCORDION_TEXT_SX, m: 0 }}>
          <TText
            keyName="sidebar.front_page.energy_classes.body_1"
            ns="energiakartta"
          />
        </Box>
        <Box component="p" sx={{ ...ACCORDION_TEXT_SX, m: 0 }}>
          <TText
            keyName="sidebar.front_page.energy_classes.body_2"
            ns="energiakartta"
          />
        </Box>
        <Box component="p" sx={{ ...ACCORDION_TEXT_SX, m: 0 }}>
          <TText
            keyName="sidebar.front_page.energy_classes.body_3"
            ns="energiakartta"
          />
        </Box>
        <Box
          component="p"
          sx={{ ...ACCORDION_TEXT_SX, m: 0, fontWeight: 700 }}
        >
          <TText
            keyName="sidebar.front_page.energy_classes.note"
            ns="energiakartta"
          />
        </Box>
      </Box>

      {showDefinitions && (
        <Box
          component="ul"
          sx={{
            mt: '2rem',
            mb: 0,
            p: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            listStyle: 'none',
          }}
        >
          {ENERGY_CERTIFICATE_CLASS_CODES.map((classCode) => (
            <Box
              key={classCode}
              component="li"
              sx={{
                display: 'grid',
                gridTemplateColumns: '1.75rem minmax(0, 1fr)',
                columnGap: '0.75rem',
                alignItems: 'start',
              }}
            >
              <Box
                component="span"
                aria-hidden="true"
                sx={{
                  width: '1.75rem',
                  height: '1.75rem',
                  borderRadius: '50%',
                  backgroundColor: ENERGY_CERTIFICATE_CLASS_COLORS[classCode],
                  color: '#111111',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: 0,
                }}
              >
                {classCode}
              </Box>
              <Box
                component="p"
                sx={{
                  ...ACCORDION_TEXT_SX,
                  m: 0,
                  lineHeight: '1rem',
                }}
              >
                <TText
                  keyName={`sidebar.front_page.energy_classes.class_definitions.${classCode}`}
                  ns="energiakartta"
                />
              </Box>
            </Box>
          ))}
        </Box>
      )}

      <PolymorphicBox
        component="button"
        type="button"
        onClick={() => setShowDefinitions((value) => !value)}
        sx={{
          mt: '2.25rem',
          p: 0,
          border: 0,
          background: 'transparent',
          color: '#075CFF',
          cursor: 'pointer',
          font: 'inherit',
          textAlign: 'left',
          textDecoration: 'underline',
          textDecorationThickness: '1px',
          textUnderlineOffset: '0.125rem',
          '&:focus-visible': {
            outline: '2px solid #075CFF',
            outlineOffset: '0.1875rem',
          },
        }}
      >
        <Box
          component="span"
          sx={{
            ...ACCORDION_TEXT_SX,
            color: 'inherit',
            textDecoration: 'inherit',
            textUnderlineOffset: 'inherit',
          }}
        >
          <TText
            keyName={
              showDefinitions
                ? 'sidebar.front_page.energy_classes.hide_definitions'
                : 'sidebar.front_page.energy_classes.definitions'
            }
            ns="energiakartta"
          />
        </Box>
      </PolymorphicBox>
    </Box>
  )
}

export default EnergyClassesAccordionContent
