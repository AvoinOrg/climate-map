import React, { useEffect, useContext, useState } from "react";
import {
  Theme,
  TableContainer,
  Paper,
  Container,
  FormControl,
  InputLabel,
  OutlinedInput,
} from "@mui/material";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { NavLink, useLocation, Link, withRouter } from "react-router-dom";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { flyTo } from "src/map/map";
import { setFilter, map } from "src/map/map";
import { UserContext } from "../User";
import * as LayerGroupState from "src/map/LayerGroupState";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
      padding: "84px 20px 20px 20px",
      display: "flex",
      flexDirection: "column",
      overflowY: "hidden",
    },
    naviContainer: {
      height: "54px",
      minHeight: "54px",
      maxHeight: "54px",
    },
    naviHeader: {
      display: "flex",
      fontSize: "18px",
      lineHeight: "22px",
      padding: "15px 5px 15px 5px",
      width: "300px",
      fontWeight: theme.typography["regular"].fontWeight,
      overflow: "hidden",
    },
    formControl: {
      margin: "0 16px 16px 0",
      minWidth: 120,
    },
    container: {
      fontFamily: theme.typography.fontFamily[0],
      display: "flex",
      flexDirection: "column",
      overflowX: "auto",
      margin: "16px 0 0 0",
      padding: "16px 16px 0 16px",
    },
    textField: {
      width: "100%",
      margin: "0 0 10px 0",
    },
    listContainer: {
      overflowY: "auto",
      padding: "10px 0 10px 30px",
      border: "1px solid rgba(0, 0, 0, 0.23)",
      borderRadius: "4px",
      width: "100%",
      margin: "10px 0 20px 0",
    },
    list: {
      padding: "0 0 0 0",
    },
  })
);

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const ValioCarbonGrassFields = (props) => {
  const classes = useStyles({});
  const { fetchSource }: any = useContext(UserContext);

  const [data, setData] = useState(null);
  const [currentField, setCurrentField] = useState("");

  let query = useQuery();

  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    LayerGroupState.enableOnlyOneGroup("valio-carbon-grass-fields");

    //@ts-ignore
    map.on("click", "valio-carbon-grass-fields-pin", function (e) {
      const id = e.features[0].properties["TILATUNNUS"];
      setCurrentField("");
      props.history.push(`/layers/valio-carbon-grass-fields?field=${id}`);
    });

    fetchSource("valio-carbon-grass-fields/centroids.geojson").then((data) => {
      const features = data.features.sort((a, b) =>
        Number(a.properties["TILATUNNUS"]) > Number(b.properties["TILATUNNUS"])
          ? 1
          : -1
      );
      setData(features);
    });

    return () => {
      LayerGroupState.disableGroup("valio-carbon-grass-fields");
    };
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (data) {
      if (searchValue === "") {
        setFilter("valio-carbon-grass-fields-fill", null);
        setFilter("valio-carbon-grass-fields-outline", null);
        setFilter("valio-carbon-grass-fields-pin", null);
        setFilter("valio-carbon-grass-fields-label", null);
      } else {
        const result = data
          .filter((x) => !x.properties["TILATUNNUS"].startsWith(searchValue))
          .map((x) => x.properties["TILATUNNUS"]);

        setFilter("valio-carbon-grass-fields-fill", [
          "!in",
          "TILATUNNUS",
          ...result,
        ]);
        setFilter("valio-carbon-grass-fields-outline", [
          "!in",
          "TILATUNNUS",
          ...result,
        ]);
        setFilter("valio-carbon-grass-fields-label", [
          "!in",
          "TILATUNNUS",
          ...result,
        ]);
        setFilter("valio-carbon-grass-fields-pin", [
          "!in",
          "TILATUNNUS",
          ...result,
        ]);
      }
    }
    // eslint-disable-next-line
  }, [searchValue]);

  useEffect(() => {
    const field = query.get("field");
    if (data && field && field !== currentField) {
      const entry = data.find((x) => x.properties["TILATUNNUS"] === field);
      flyTo(entry.geometry.coordinates[0], entry.geometry.coordinates[1], 13);
      setCurrentField(field);
    }
    // eslint-disable-next-line
  }, [query, data]);

  const handleValueChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);
  };

  return (
    <div className={classes.root}>
      <div className={classes.naviContainer}>
        <TableContainer component={Paper}>
          <NavLink to="/" className={classes.naviHeader + " neutral-link"}>
            <ExpandMoreIcon style={{ transform: "rotate(90deg)" }} />
            {"Valio Carbon Grass Fields"}
          </NavLink>
        </TableContainer>
      </div>
      <TableContainer component={Paper} className={classes.container}>
        <FormControl className={classes.textField} variant="outlined">
          <InputLabel color={"secondary"}>Filter</InputLabel>
          <OutlinedInput
            id="fao_filter"
            onChange={handleValueChange}
            value={searchValue}
            color={"secondary"}
            labelWidth={40}
          />
        </FormControl>
        <div className={classes.listContainer}>
          {data && (
            <Container>
              <ul className={classes.list}>
                {data
                  .filter((x) =>
                    x.properties["TILATUNNUS"].startsWith(searchValue)
                  )
                  .map((x) => (
                    <li key={x.properties["TILATUNNUS"]}>
                      <Link
                        to={`/layers/valio-carbon-grass-fields?field=${x.properties["TILATUNNUS"]}`}
                      >
                        {x.properties["TILATUNNUS"]}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Container>
          )}
        </div>
      </TableContainer>
    </div>
  );
};

export default withRouter(ValioCarbonGrassFields);
