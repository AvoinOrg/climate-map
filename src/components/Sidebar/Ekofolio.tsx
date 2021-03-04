import { Container } from "@material-ui/core";
import React, { useEffect } from "react";
import { Link, useRouteMatch } from "react-router-dom";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";

import { flyTo } from "src/map/map";
import { ekofolioAreas } from "src/map/layers/ekofolio";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      display: "flex",
      flexDirection: "column"
    },
    data: {
      marginTop: 65
    },
    avoinLogoWrapper: {
      maxWidth: 200,
      position: "absolute",
      left: 25,
      bottom: 10
    },
    logo: {
      width: 195,
    },
  })
);

function Ekofolio() {
  const classes = useStyles({});

  let {
    // @ts-ignore
    params,
  } = useRouteMatch();

  useEffect(() => {
    let area = "area-1"
    if (params[0].includes("area")) {
      area = params[0].substring(1)
    }
    const areaNum = +area.split("-")[1];
    const areaIdx = areaNum - 1;
    const entry = ekofolioAreas[areaIdx];
    const zoom = entry.zoom;
    console.log(entry.center[0], entry.center[1], zoom);
    flyTo(entry.center[0], entry.center[1], zoom);
  }, [params]);

  // i.e. which projection/scenario is in use:
  return (
    <div className={classes.container}>
      <div className={classes.data}>
        <Container>
          <p>
            <strong>Ekofolio areas</strong>
          </p>

          <ul>
            {ekofolioAreas.map((x, i) => (
              <li key={x.name}>
                <Link to={`area-${i + 1}`}>{x.name}</Link>
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
      </div>

      {/* <div className={classes.avoinLogoWrapper}>
        <a href="http://about.avoinmap.org">
          <img className={classes.logo} src={Logo} alt="Logo" />
        </a>
      </div> */}
    </div>
  );
}

export default Ekofolio;
