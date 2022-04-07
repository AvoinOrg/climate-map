import React from "react";
import createStyles from '@mui/styles/createStyles';
import makeStyles from '@mui/styles/makeStyles';
import { AOAccordionLink, AOAccordion } from "./AOAccordion";

const useStyles = makeStyles(() =>
  createStyles({
    root: {
      width: "100%",
    },
    legendBox: {
      backgroundColor: (props: any) => props.color,
      border: "1px solid black",
      width: "1rem",
      height: "1rem",
      padding: 5,
      margin: "0 5px -2px 0",
      display: "inline-block",
    },
  })
);

const LegendBox = (props) => {
  const classes = useStyles({ color: props.color });
  return (
    <span>
      <span className={classes.legendBox}></span>
      {props.title}
    </span>
  );
};

const MatureForestContent = () => (
  <div>
    <p>
      This layer shows forests that have reached the approximate threshold for
      regeneration felling.
    </p>
    Legend:
    <legend
      id="legend-mature-forests"
      style={{ display: "flex", flexDirection: "column", padding: "6px 0 0 0" }}
    >
      <LegendBox color="rgba(73, 25, 2320, 0.65)" title="Mature forest" />
      <LegendBox color="rgba(206, 244, 66, 0.35)" title="Other forest" />
    </legend>
  </div>
);

const MangroveForestContent = () => (
  <div>
    <p>
      This layer shows mangrove forests monitored by
      {}{" "}
      <a href="https://www.globalmangrovewatch.org/about/">
        the Global Mangrove Watch
      </a>
      .
    </p>
    <p>The data shown here is from 2010.</p>
  </div>
);

const TropicalForestContent = () => (
  <div>
    <p>
      <a href="https://www.globalforestwatch.org/">the Global Forest Watch</a>
      {} tree plantations data from combined with
      {} <a href="https://www.cifor.org/">CIFOR data</a> of global wetlands.
    </p>
    <p>
      Green areas area forest plantations that are on mineral soil and brown
      areas those in peatlands.
    </p>
    <p>
      Click on a forest plantation to view more information and estimated
      emission reduction potentials of peatland forest plantations when the
      groundwater level is lifted by 40 cm.
    </p>
  </div>
);

const ForestCoverageContent = () => (
  <div>
    <p>
      <a href="https://developers.google.com/earth-engine/datasets/catalog/UMD_hansen_global_forest_change_2020_v1_8">
        Hansen/UMD/Google/USGS/NASA
      </a>
      {} global forest change data.
    </p>
    <p>
      Shows global forest coverage from year 2000, forest cover loss from years
      2000-2020, and forest cover gain from years 2000-2012.
    </p>
    Legend:
    <legend
      id="legend-forest-coverage"
      style={{ display: "flex", flexDirection: "column", padding: "6px 0 0 0" }}
    >
      <LegendBox color="green" title="Forest coverage (2000)" />
      <LegendBox color="red" title="Forest coverage loss (2000-2020)" />
      <LegendBox color="blue" title="Forest coverage gain (2000-2012)" />
      <LegendBox color="purple" title="Both gain (2000-2020) and loss (2000-2012)" />
    </legend>
  </div>
);

const ForestContent = () => {
  const classes = useStyles({});
  return (
    <div className={classes.root}>
      <AOAccordionLink
        href="/layers/fi-forest"
        label={"Finland's Forests"}
      />
      <AOAccordion
        groupName={"hansen"}
        label={"Global forest coverage"}
        content={<ForestCoverageContent />}
      />
      <AOAccordion
        groupName={"mature-forests"}
        label={"Mature Forests"}
        content={<MatureForestContent />}
      />
      <AOAccordion
        groupName={"mangrove-forests"}
        label={"Mangrove forests"}
        content={<MangroveForestContent />}
      />
      <AOAccordion
        groupName={"gfw_tree_plantations"}
        label={"Tree plantations"}
        content={<TropicalForestContent />}
      />
    </div>
  );
};

export default ForestContent;
