import { Container, Paper } from '@material-ui/core';
import React from 'react';
import { useObservable } from 'micro-observables';

import * as LayerGroupState from 'src/map/LayerGroupState';


function OmaihkaUI() {
  // react to any changes but don't use this directly.
  useObservable(LayerGroupState.layerGroups)

  const yearVisible = LayerGroupState.isGroupEnabled('kariba_changes_2019') ? 2019 : 2020
  const swapLayer = () => LayerGroupState.enableOnlyOneGroup(yearVisible !== 2019 ? 'kariba_changes_2019' : 'kariba_changes_2020')

  // i.e. which projection/scenario is in use:
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

      </Container>
    </Paper>

  </div>
}

export default OmaihkaUI
