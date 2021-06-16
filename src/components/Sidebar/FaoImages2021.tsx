import {
  Container,
  Paper,
  FormControl,
  InputLabel,
  OutlinedInput,
} from "@material-ui/core";
import React, { useEffect, useState } from "react";
import { Link, useLocation, withRouter } from "react-router-dom";
import { makeStyles, Theme, createStyles } from "@material-ui/core/styles";
import { setFilter, map } from "src/map/map";

import { flyTo } from "src/map/map";
import addFaoImages2021 from "src/map/layers/fao_images_2021"

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    container: {
      fontFamily: theme.typography.fontFamily[0],
      display: "flex",
      flexDirection: "column",
      overflowX: "hidden",
    },
    headerContainer: {
      marginTop: "64px",
      padding: "25px 30px 0 15px",
      height: "200px",
    },
    headerText: {
      margin: "0 0 0 10px",
    },
    textField: {
      width: "100%",
      maxWidth: "384px",
      margin: "20px 8px 10px 8px",
    },
    listContainer: {
      overflowX: "scroll",
      padding: "10px 0 10px 30px",
      border: "1px solid rgba(0, 0, 0, 0.23)",
      borderRadius: "4px",
      width: "256px",
      margin: "10px 23px 20px 23px",
    },
    list: {
      padding: "0 0 0 0",
    },
  })
);

interface IHashParams {
  secret: string;
}
const hashParams: IHashParams = window.location.search
  .replace(/^[#?]*/, "")
  .split("&")
  .reduce(
    (prev, item) =>
      Object.assign({ [item.split("=")[0]]: item.split("=")[1] }, prev),
    {}
  ) as IHashParams;

const URL_PREFIX = `https://${hashParams.secret}.cloudfront.net`;

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function FaoImages2021(props) {
  const [data, setData] = useState(null);
  const [currentArea, setCurrentArea] = useState("");

  let query = useQuery();
  const classes = useStyles({});

  const [searchValue, setSearchValue] = useState("");

  useEffect(() => {
    addFaoImages2021()

    map.on("click", "fao-images-2021-pin", function (e) {
      const id = e.features[0].properties.id;
      setCurrentArea("");
      props.history.push(
        `/layers/fao-images-2021?area=${id}&secret=${hashParams.secret}`
      );
    });

    fetch(`${URL_PREFIX}/fao_centroids.geojson`, {
      method: "GET",
      mode: "cors",
    })
      .then((res) => res.json())
      .then((json) => {
        json.features = json.features.sort((a, b) =>
          Number(a.properties.id) > Number(b.properties.id) ? 1 : -1
        );
        setData(json);
      })
      .catch((err) => {
        console.error(err);
      });
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (data) {
      if (searchValue === "") {
        setFilter("fao-images-2021-boundary", null);
        setFilter("fao-images-2021-boundary2", null);
        setFilter("fao-images-2021-pin", null);
        setFilter("fao-images-2021-label", null);
      } else {
        const result = data.features
          .filter((x) => !x.properties.id.startsWith(searchValue))
          .map((x) => x.properties.id);

        setFilter("fao-images-2021-boundary", ["!in", "id", ...result]);
        setFilter("fao-images-2021-boundary2", ["!in", "id", ...result]);
        setFilter("fao-images-2021-label", ["!in", "id", ...result]);
        setFilter("fao-images-2021-pin", ["!in", "id", ...result]);
      }
    }
    // eslint-disable-next-line
  }, [searchValue]);

  useEffect(() => {
    const area = query.get("area");
    if (data && area && area !== currentArea) {
      const entry = data.features.find((x) => x.properties.id === area);
      flyTo(entry.geometry.coordinates[0], entry.geometry.coordinates[1], 10);
      setCurrentArea(area);
    }
    // eslint-disable-next-line
  }, [query, data]);

  const handleValueChange = (event) => {
    const value = event.target.value;
    setSearchValue(value);
  };

  // i.e. which projection/scenario is in use:
  return (
    <div className={classes.container}>
      <div className={classes.headerContainer}>
        <h3 className={classes.headerText}>Areas</h3>
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
      </div>
      <div className={classes.listContainer}>
        <Paper className="grid-col1" elevation={5}>
          {data && (
            <Container>
              <ul className={classes.list}>
                {data.features
                  .filter((x) => x.properties.id.startsWith(searchValue))
                  .map((x) => (
                    <li key={x.properties.id}>
                      <Link
                        to={`/layers/fao-images-2021?area=${x.properties.id}&secret=${hashParams.secret}`}
                      >
                        {x.properties.id}
                      </Link>
                    </li>
                  ))}
              </ul>
            </Container>
          )}
        </Paper>
      </div>
    </div>
  );
}

export default withRouter(FaoImages2021);
