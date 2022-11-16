import { Container, Paper } from "@mui/material";
import React, { useEffect } from "react";
import { Link, useRouteMatch } from "react-router-dom";

// @ts-ignore
import { flyTo } from "src/map/map";
import { ekofolioAreas } from "src/map/layers/ekofolio";

function Ekofolio() {
  let {
    // @ts-ignore
    params: { area },
  } = useRouteMatch();
  if (!area) area = "area-1";

  useEffect(() => {
    const areaNum = +area.split("-")[1];
    const areaIdx = areaNum - 1;
    const entry = ekofolioAreas[areaIdx];
    const zoom = entry.zoom;
    flyTo(entry.center[0], entry.center[1], zoom);
  }, [area]);

  // i.e. which projection/scenario is in use:
  return (
    <div className="grid-parent grid-parent-report-closed">
      <Paper className="grid-col1" elevation={5}>
        <Container>
          <p>
            <strong>Ekofolio areas</strong>
          </p>

          <ul>
            {ekofolioAreas.map((x, i) => (
              <li key={x.name}>
                <Link to={`/layers/ekofolio/area-${i + 1}`}>{x.name}</Link>
              </li>
            ))}
          </ul>

          <table>
            <tbody>
              <tr>
                <th>Total area</th>
                <td>9.0 ha</td>
              </tr>
              <tr>
                <th>Forest land</th>
                <td>8.0 ha</td>
              </tr>
              <tr>
                <th>Agriculture land</th>
                <td>0.0 ha</td>
              </tr>
              <tr>
                <th>Other land</th>
                <td>0.9 ha</td>
              </tr>
              <tr>
                <th>Timber volume</th>
                <td>1,089.1 m3</td>
              </tr>
              <tr>
                <th>Timber volume</th>
                <td>135.5 m3/ha</td>
              </tr>
              <tr>
                <th>Price</th>
                <td>23.4 €/m3</td>
              </tr>
              <tr>
                <th>Site Quality Index (bonity)</th>
                <td>3.1</td>
              </tr>
              <tr>
                <th>Density</th>
                <td>63 %</td>
              </tr>
              <tr>
                <th>Annual growth</th>
                <td>3 m3/ha</td>
              </tr>
              <tr>
                <th>Calculated values, 2% interest</th>
                <td>3,273 €/ha, or 18.9€/m3</td>
              </tr>
            </tbody>
          </table>
        </Container>
      </Paper>
    </div>
  );
}

export default Ekofolio;
