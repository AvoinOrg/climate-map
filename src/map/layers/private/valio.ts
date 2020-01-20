import { Expression } from 'mapbox-gl';
import { addLayer, addSource } from '../../map';
import { fieldPlotTextField, fieldColorHistosol, fieldColorDefault, fieldPlotHistosolRatio, setupPopupHandlerForMaviPeltolohko } from '../fields/common';
import { addDataset } from './common';
import { ILayerOptions, createHighlightingForLayerGroup, IRenderFeature } from '../../layer_highlighting';
import { pp } from '../../utils';


interface IFieldAggregateProps {
    localid: string;
    region_type: string;
    name_fi: string;
    name_sv: string;
    st_area: number;
    area_peatland: number;
    area_mineral_land: number;
    area_total: number;
    area_abandoned_0pct_peatland: number;
    area_abandoned_0pct_mineral_land: number;
    area_abandoned_0pct_total: number;
    area_abandoned_10pct_peatland: number;
    area_abandoned_10pct_mineral_land: number;
    area_abandoned_10pct_total: number;
    area_abandoned_20pct_peatland: number;
    area_abandoned_20pct_mineral_land: number;
    area_abandoned_20pct_total: number;
    area_abandoned_50pct_peatland: number;
    area_abandoned_50pct_mineral_land: number;
    area_abandoned_50pct_total: number;
    area_abandoned_100pct_peatland: number;
    area_abandoned_100pct_mineral_land: number;
    area_abandoned_100pct_total: number;
}


const addValio = (secret: string) => {
    const fillColor: Expression = ["case", [">=", fieldPlotHistosolRatio, 0.4], fieldColorHistosol, fieldColorDefault];

    addSource('valio_fields', {
        "type": "vector",
        "tiles": [`https://map.buttonprogram.org/private/${secret}/valio_fields/{z}/{x}/{y}.pbf?v=3`],
        bounds: [19, 59, 32, 71], // Finland
        "minzoom": 10,
        "maxzoom": 11,
    });

    addLayer({
        'id': 'valio-fields-fill',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        'type': 'fill',
        'paint': {
            'fill-color': fillColor,
        },
        BEFORE: 'FILL',
    })
    addLayer({
        'id': 'valio-fields-boundary',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        'type': 'line',
        'paint': {
            'line-opacity': 0.75,
        },
        BEFORE: 'OUTLINE',
    })

    addLayer({
        'id': 'valio-fields-co2',
        'source': 'valio_fields',
        'source-layer': 'valio_fields',
        // 'source-layer': 'suopellot',
        'type': 'symbol',
        "minzoom": 14.5,
        // 'maxzoom': zoomThreshold,
        "paint": {},
        "layout": {
            "symbol-placement": "point",
            "text-font": ["Open Sans Regular"],
            "text-size": 20,
            // NB: 400t CO2eq/ha/20yrs -> 2kg/m2/y
            // round(0.0002*total_area) -> reduce precision -> *10 -> 2kg/m2
            "text-field": fieldPlotTextField,
        },
        BEFORE: 'LABEL',
    })

    setupPopupHandlerForMaviPeltolohko('Field plot (Valio)', 'valio-fields-fill');


    const sources = {
        municipality: 'agg_valio_plohko2017_all_au_kunnat',
        region: 'agg_valio_plohko2017_all_au_regions',
        'regional-state': 'agg_valio_plohko2017_all_au_regional_states',
        country: 'agg_valio_plohko2017_all_au_fi',
    }
    const layerOptions: ILayerOptions = {
        // 'valio-fields': { minzoom: 14, id: 'standid' },
        'valio-fields-municipality': { minzoom: 7.5, maxzoom: 10, id: 'localid' },
        'valio-fields-region': { minzoom: 5.5, maxzoom: 7.5, id: 'localid' },
        'valio-fields-regional-state': { minzoom: 4, maxzoom: 5.5, id: 'localid' },
        'valio-fields-country': { minzoom: 0, maxzoom: 4, id: 'localid' },
    }

    for (const [source,path] of Object.entries(sources)) {
        const sourceName = `valio-fields-${source}`
        const opts = layerOptions[sourceName];
        const sourceOpts = {
            "type": "vector",
            "tiles": [`https://map.buttonprogram.org/private/${secret}/${path}/tiles/{z}/{x}/{y}.pbf.gz?v=1`],
            minzoom: 0,
            maxzoom: Math.ceil(opts.maxzoom!),
            bounds: [19, 59, 32, 71], // Finland
        };
        // @ts-ignore
        addSource(sourceName, sourceOpts);
    }

    const output = document.querySelector('.valio-output');
    const renderFeature: IRenderFeature = (feature, bounds, layer) => {
        if (!feature) { return; }

        const p = feature.properties as IFieldAggregateProps;
        output.innerHTML = `
        <h2>${p.name_fi}</h2>

        Area: ${pp(1e-6 * p.st_area, 3)} km<sup>2</sup>
        <hr/>

        <h3>Fields</h3>
        Peatland fields: <strong>${pp(+p.area_peatland, 3)} ha</strong><br/>
        Mineral land fields: <strong>${pp(+p.area_mineral_land, 3)} ha</strong><br/>
        Total: <strong>${pp(+p.area_total, 3)} ha</strong><br/>

        <hr/>
        <h3>Potentially abandoned fields</h3>
        Peatland fields: <strong>${pp(+p.area_abandoned_20pct_peatland, 2)} ha</strong><br/>
        Mineral land fields: <strong>${pp(+p.area_abandoned_20pct_mineral_land, 2)} ha</strong><br/>
        Total: <strong>${pp(+p.area_abandoned_20pct_total, 2)} ha</strong><br/>
        `;
    }

    const fillColorAggregate: Expression = [
        'interpolate',
        ['linear'],
        [
            'case',
            ['==', 0, ['to-number', ['get', 'area_total']]], -1,
            ['/',
                ['to-number', ['get', 'area_peatland']],
                ['to-number', ['get', 'area_total']]
            ],
        ],
        -1, 'rgba(200,200,200,0.5)',
        0, fieldColorDefault,
        1, fieldColorHistosol,
    ];

    createHighlightingForLayerGroup('valio', fillColorAggregate, layerOptions, renderFeature);
};

addDataset('valio', addValio);
