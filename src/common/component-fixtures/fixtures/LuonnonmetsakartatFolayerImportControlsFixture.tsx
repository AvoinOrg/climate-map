import React from 'react'

import type { ComponentFixture } from '#/common/component-fixtures/types'
import { Box } from '#/common/style/theme'
import FolayerImportShp from 'applets/luonnonmetsakartat/components/FolayerImportShp'
import FolayerUpdateShp from 'applets/luonnonmetsakartat/components/FolayerUpdateShp'
import { FolayerConfState } from 'applets/luonnonmetsakartat/common/types'
import FolayerImportActionsRow from 'applets/luonnonmetsakartat/components/FolayerImportActionsRow'
import FolayerImportCodeRecordSelect from 'applets/luonnonmetsakartat/components/FolayerImportCodeRecordSelect'

const noop = () => {}
const invalidBuffers = [new Uint8Array([0, 1, 2, 3]).buffer]
const emptyBuffers: ArrayBuffer[] = []
const fixtureLayer = {
  id: 'fixture',
  name: 'Fixture',
  colorCode: '#06402B',
  createdTs: 0,
  updatedTs: 0,
  state: FolayerConfState.Idle,
  isVisible: false,
  unsyncedChanges: false,
}

const fixtureColumns = [
  'id',
  'nimi',
  'kunta',
  'maakunta',
  'kuvaus',
  'pinta_ala',
  'metsakuvion_erittain_pitka_sarakkeen_nimi_joka_jatkuu',
]

const ImportControlsFixtureWrapper = ({
  children,
}: {
  children: React.ReactNode
}) => (
  <Box
    sx={{
      width: 360,
      maxWidth: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}
  >
    {children}
  </Box>
)

const InteractiveCodeRecordSelect = ({
  columns = fixtureColumns,
  initialColumn,
  allowEmpty = false,
  label,
  defaultOpen = false,
}: {
  columns?: string[]
  initialColumn?: string
  allowEmpty?: boolean
  label: string
  defaultOpen?: boolean
}) => {
  const [selectedColumn, setSelectedColumn] = React.useState(initialColumn)

  return (
    <FolayerImportCodeRecordSelect
      columns={columns}
      selectedColumn={selectedColumn}
      onColumnChange={setSelectedColumn}
      allowEmpty={allowEmpty}
      label={label}
      defaultOpen={defaultOpen}
    />
  )
}

export const luonnonmetsakartatFolayerImportControlsFixture: ComponentFixture =
  {
    id: 'luonnonmetsakartat-folayer-import-controls',
    label: 'Luonnonmetsakartat folayer import controls',
    locale: 'fi',
    description:
      'Natural forest admin import action and code-record selector states for F047 remigration coverage.',
    sourceGlobs: [
      'src/applets/luonnonmetsakartat/components/FolayerImportShp.tsx',
      'src/applets/luonnonmetsakartat/components/FolayerUpdateShp.tsx',
      'src/applets/luonnonmetsakartat/common/useFolayerShapefile.ts',

      'src/applets/luonnonmetsakartat/components/FolayerImportActionsRow.tsx',
      'src/applets/luonnonmetsakartat/components/FolayerImportCodeRecordSelect.tsx',
      'src/common/component-fixtures/fixtures/LuonnonmetsakartatFolayerImportControlsFixture.tsx',
    ],
    wrapper: ImportControlsFixtureWrapper,
    states: [
      {
        id: 'import-unparsed',
        label: 'Import before parsing',
        description:
          'No columns or enabled accept action before parsing completes.',
        render: () => (
          <FolayerImportShp
            fileBuffers={emptyBuffers}
            onFinish={noop}
            isInitializing={false}
          />
        ),
      },
      {
        id: 'import-parse-error',
        label: 'Import parse error',
        waitFor: 'role=alert',
        description:
          'A real malformed ZIP produces visible feedback and disabled accept.',
        render: () => (
          <FolayerImportShp
            fileBuffers={invalidBuffers}
            onFinish={noop}
            isInitializing={false}
          />
        ),
      },
      {
        id: 'replacement-parse-error',
        label: 'Replacement parse error',
        waitFor: 'role=alert',
        description:
          'A real malformed replacement ZIP produces visible feedback.',
        render: () => (
          <FolayerUpdateShp
            fileBuffers={invalidBuffers}
            adminFolayerConf={fixtureLayer}
          />
        ),
      },
      {
        id: 'accept-enabled',
        label: 'Accept enabled',
        description:
          'Accept imported forest-layer action when form state is valid.',
        render: () => (
          <FolayerImportActionsRow
            onClickAccept={noop}
            isAcceptDisabled={false}
          />
        ),
      },
      {
        id: 'accept-disabled',
        label: 'Accept disabled',
        description: 'Disabled accept action before the import can be created.',
        render: () => (
          <FolayerImportActionsRow onClickAccept={noop} isAcceptDisabled />
        ),
      },
      {
        id: 'code-record-empty',
        label: 'Code selector empty',
        description:
          'Selector helper returns no control when no columns are loaded.',
        render: () => (
          <InteractiveCodeRecordSelect columns={[]} label="Tunnistesarake" />
        ),
      },
      {
        id: 'code-record-selected',
        label: 'Code selector selected',
        description:
          'Code-record selector after a matching shapefile column is selected.',
        render: () => (
          <InteractiveCodeRecordSelect
            initialColumn="metsakuvion_erittain_pitka_sarakkeen_nimi_joka_jatkuu"
            label="Nimisarake"
          />
        ),
      },
      {
        id: 'code-record-allow-empty',
        label: 'Optional code selector',
        description:
          'Optional code-record selector with the empty value allowed.',
        waitFor: 'role=option',
        render: () => (
          <InteractiveCodeRecordSelect
            allowEmpty
            defaultOpen
            label="Kuvaussarake"
          />
        ),
      },
    ],
  }
