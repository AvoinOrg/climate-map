// import { layerOptions } from '../../map/layers//fi_hiiliporssi';
import { createStyles, makeStyles } from '@material-ui/core';
import { useObservable } from 'micro-observables';
import React, { useEffect, useState } from 'react';
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css'

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
        const idName = "name"
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
            maxWidth: '600px',
            minWidth: '300px',
            padding: '80px 15px 50px 15px'
        },
        info: {
            margin: "5px 0 0 0",
            whiteSpace: "pre-line"
        },
        description: {
            margin: "25px 0 0 0",
            whiteSpace: "pre-line"
        },
        image: {
            maxWidth: '100%',
            margin: "25px 0 0 0",
            boxShadow: "3px 6px 18px -3px rgba(0,0,0,0.75)"
        }
    }),
);

const HiiliporssiLocation = (props) => {
    const classes = useStyles({})
    return (
        <div className={classes.root}>
            {props.data.nimi && <h1>{props.data.nimi}</h1>}
            {props.data.omistaja && <p className={classes.info}><b>Omistaja: </b>{props.data.omistaja}</p>}
            {props.data.ennallistamisalue && <p className={classes.info}><b>Ennallistamisalue: </b>{props.data.ennallistamisalue}</p>}
            {props.data.vaikutusalue && <p className={classes.info}><b>Vaikutusalue: </b>{props.data.vaikutusalue}</p>}
            {props.data.kuvaus && <p className={classes.description}>{props.data.kuvaus}</p>}
            {props.data["ennallistamisen eteneminen"] && <p className={classes.description}><b>Ennallistamisen eteneminen: </b>{props.data["ennallistamisen eteneminen"]}</p>}

            {(props.data.kuvat && props.data.kuvat.length > 0) && props.data.kuvat.map((link, i) => {
                return (
                    <Zoom key={i}>
                        <img className={classes.image}
                            src={link}
                            alt=""
                        />
                    </Zoom>
                )
            })}
            {(props.data.kuvaaja) && (<p className={classes.info}><b>Kuvaaja: </b>{props.data.kuvaaja}</p>)}
        </div>
    )
}


function Hiiliporssi() {
    const { feature } = useObservable(SelectedFeatureState.selectedFeature);
    const hasFeature = feature !== null
    const [data, setData] = useState(null);

    useEffect(() => {
        fetch("https://server.avoin.org/data/map/hiiliporssi/data.json", {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
            },
        }).then(res => res.json()).then(json => {
            const objects = JSON.parse(json);
            const keyedObjects = {}
            for (const i in objects) {
                const obj = objects[i]
                if (obj.kansionimi) {
                    keyedObjects[obj.kansionimi] = objects[i]
                }
            }
            setData(keyedObjects)
        }).catch(err => {
            console.error(err)
        });
    }, [])

    useEffect(() => {
        if (!hasFeature) SidebarState.setVisible(false)
    }, [hasFeature])

    return (
        hasFeature ? <HiiliporssiLocation data={data[feature.properties.name]}></HiiliporssiLocation> : <></>)
}

export default Hiiliporssi