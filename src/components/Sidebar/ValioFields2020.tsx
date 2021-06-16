import React, { useEffect } from "react";
import {
  createStyles,
  makeStyles,
  Theme,
  Table,
  TableBody,
  TableRow,
  TableHead,
  TableContainer,
  TableCell,
  Paper,
} from "@material-ui/core";
import { NavLink } from "react-router-dom";
import ExpandMoreIcon from "@material-ui/icons/ExpandMore";
import * as LayerGroupState from "src/map/LayerGroupState";

const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    root: {
      width: "100%",
      fontWeight: 600,
      padding: "64px 10px 100px 10px",
    },
    header: {
      padding: "0 16px 0 16px",
      fontWeight: theme.typography.fontWeightRegular,
    },
    dataButton: {
      margin: "16px 16px 16px 16px",
      fontSize: 14,
    },
    formControl: {
      margin: "0 16px 16px 0",
      minWidth: 120,
    },
  })
);

const ValioFields2020 = () => {
  const classes = useStyles({});

  useEffect(() => {
    LayerGroupState.enableOnlyOneGroup("valio-fields-2020");

    return () => {
      LayerGroupState.disableGroup("valio-fields-2020");
    };
  }, []);

  return (
    <div className={classes.root}>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <NavLink
                  to="/"
                  className="neutral-link"
                  style={{ display: "flex" }}
                >
                  <ExpandMoreIcon style={{ transform: "rotate(90deg)" }} />
                  {"Valio fields"}
                </NavLink>
              </TableCell>
              <TableCell align="right">
                {/* <Button2 onClick={onFitLayerBounds} size="small">
                  <GpsFixed fontSize="small" />
                </Button2> */}
              </TableCell>
            </TableRow>
          </TableHead>
        </Table>
      </TableContainer>
    </div>
  );
};

export default ValioFields2020;
