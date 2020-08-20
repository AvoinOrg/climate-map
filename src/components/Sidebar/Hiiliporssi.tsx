// import { layerOptions } from '../../map/layers//fi_hiiliporssi';
import { createStyles, makeStyles } from '@material-ui/core';
import { useObservable } from 'micro-observables';
import React, { useEffect, useRef, useState } from 'react';

import { genericPopupHandler, querySourceFeatures, setFilter } from '../../map/map';
import * as SelectedFeatureState from './HiiliporssiSelectedLayer';
import { assert, getGeoJsonGeometryBounds } from '../../map/utils';
import * as SidebarState from './SidebarState';

const clearHighlights = () => {
    setFilter("hiiliporssi-highlighted", ['in', "Name"]);
    setFilter("hiiliporssi-marker-highlighted", ['in', "Name"]);
    setFilter("hiiliporssi-outline-highlighted", ['in', "Name"]);
    SelectedFeatureState.unsetFeature()
}

const layers = ["hiiliporssi-fill", "hiiliporssi-marker", "hiiliporssi-label"]

// eslint-disable-next-line no-loop-func

for (const index in layers) {
    const layerName = layers[index]

    genericPopupHandler(layerName, (ev) => {
        const feature = ev.features[0];

        // Only copy over currently selected features:
        const idName = "Name"
        const id = feature.properties[idName];
        assert(id, `Feature has no id: ${JSON.stringify(feature.properties)}`);

        clearHighlights();
        const newFilter = ['in', idName, id];
        setFilter("hiiliporssi-highlighted", newFilter);
        setFilter("hiiliporssi-marker-highlighted", newFilter);
        setFilter("hiiliporssi-outline-highlighted", newFilter);
        console.debug("hiiliporssi-highlighted", newFilter);

        const bounds = querySourceFeatures("hiiliporssi", "polygons")
            .filter(f => f.properties[idName] === id)
            .map(f => f.bbox || getGeoJsonGeometryBounds((f.geometry as any).coordinates))
            .reduce(
                ([a1, b1, c1, d1], [a2, b2, c2, d2]) => [
                    Math.min(a1, a2), Math.min(b1, b2),
                    Math.max(c1, c2), Math.max(d1, d2)
                ],
                [999, 999, -999, -999] // fallback bounds
            );

        const { feature: prevFeature } = SelectedFeatureState.selectedFeature.get()
        SelectedFeatureState.selectFeature({ layer: layerName, feature, bounds })
        SidebarState.setVisible(false)
        // Open the report panel immediately when a new feature is selected:
        if (feature && feature !== prevFeature)
            SidebarState.setVisible(true)
    });
}

const useStyles = makeStyles(() =>
    createStyles({
        root: {
            width: '300px',
            padding: '80px 5px 5px 15px'
        },
    }),
);

function Hiiliporssi() {
    const classes = useStyles({})
    const { feature } = useObservable(SelectedFeatureState.selectedFeature);
    const hasFeature = feature !== null

    useEffect(() => {
        if (!hasFeature) SidebarState.setVisible(false)
    }, [])

    return (
        hasFeature ? <div className={classes.root}>
            <h1>{feature.properties.Name}</h1>
        </div> : <></>)
}

export default Hiiliporssi