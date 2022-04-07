import { Container, Paper } from '@mui/material';
import React, { useEffect } from 'react';
import { useObservable } from 'micro-observables';

import * as LayerGroupState from 'src/map/LayerGroupState';
// @ts-ignore
import { flyTo } from 'src/map/map';


function OmaihkaUI() {
  useEffect(() => {
    flyTo(29.952879, -16.708240, 8)
  }, [])

  // react to any changes but don't use this directly.
  useObservable(LayerGroupState.layerGroups)

  const yearVisible = LayerGroupState.isGroupEnabled('kariba_changes_2019') ? 2019 : 2020
  const swapLayer = () => LayerGroupState.enableOnlyOneGroup(yearVisible !== 2019 ? 'kariba_changes_2019' : 'kariba_changes_2020')

  return <div className='grid-parent grid-parent-report-closed'>

    <Paper className="grid-col1" elevation={5}>
      <Container>

        <p>
          <strong>Forest cover for the year {yearVisible}</strong>
        </p>
        <p>
          <button onClick={swapLayer}>
            Show {yearVisible !== 2019 ? 2019 : 2020}
          </button>
        </p>

        <p>Total forest cover loss from 2019 to 2020: 108 ha</p>

      </Container>
    </Paper>

  </div>
}

export default OmaihkaUI
