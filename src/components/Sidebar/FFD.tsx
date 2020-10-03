import { Container, Paper } from '@material-ui/core';
import React, { useEffect } from 'react';
import { Link,useRouteMatch} from "react-router-dom";

import { flyTo } from 'src/map/map';
import {ffdCaseStudyAreas} from 'src/map/layers/fi_ffd';

function FFD() {
  // @ts-ignore
  const {params: {area}} = useRouteMatch();

  useEffect(() => {
    if (!area) return
    const areaNum = +area.split('-')[1]
    const areaIdx = areaNum - 1
    const entry = ffdCaseStudyAreas[areaIdx]
    const zoom = entry.zoom
    flyTo(entry.center[0], entry.center[1], zoom)
  }, [area])

  // i.e. which projection/scenario is in use:
  return <div className='grid-parent grid-parent-report-closed'>

  <Paper className="grid-col1" elevation={5}>
  <Container>

  <p>
  <strong>FFD Case Study Areas</strong>
  </p>

  <ul>
  {ffdCaseStudyAreas.map((x,i) => <li key={x.name}><Link to={`/layers/fi-ffd/area-${i+1}`}>{x.name}</Link></li>)}
  </ul>

  </Container>
  </Paper>

  </div>
}

export default FFD
