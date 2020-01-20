import { default as turfBooleanWithin } from '@turf/boolean-within';
import { feature as turfFeature } from '@turf/helpers';
import { flattenReduce as turfFlattenReduce } from '@turf/meta';
import { roundToSignificantDigits, pp } from '../../utils'
import { Expression } from 'mapbox-gl';
import { genericPopupHandler, createPopup } from '../../map';

// Ruokavirasto field plots CO2e formulas:
//
// histosol: 400t CO2eq/ha/20yrs -> 20t CO2e/ha/y -> 2kg/m2/y
//
// non-histosol: 2.2 CO2e/ha/year as an average for the period of 10 years.
// -> 0.22kg/m2/y
//
// NB: dataset attribute "pinta_ala" (area) is in "ares" (i.e. units of 100 m2), not m2 or hectares.

// NB: Duplicated logic because I don't know how to interpret
// Mapbox style expressions in outside contexts.
const fieldPlotCO2eFn = props => {
    const isHistosolType = t => [-104, 195511, 195512, 195513, 195514].indexOf(t) !== -1;
    const histosolRatio = (
        + (isHistosolType(props.soil_type1) ? props.soil_type1_ratio : 0)
        + (isHistosolType(props.soil_type2) ? props.soil_type2_ratio : 0)
    );
    const co2ePerHa = histosolRatio >= 0.4 ? 20 : 2.2;
    const areaHa = 1e-2 * props.pinta_ala;
    return areaHa * co2ePerHa; // tons per ha
}

const histosolCalc = roundToSignificantDigits(2, ['*', 20 * 1e-2, ['get', 'pinta_ala']]);
const nonHistosolCalc = roundToSignificantDigits(2, ['*', 2.2 * 1e-2, ['get', 'pinta_ala']]);

const fieldPlotHistosolMult = v => [
    'match', v,
    -104, 1, // Histosols
    195511, 1, // Lieju (Lj) RT
    195512, 1, // Saraturve (Ct) RT
    195513, 1, // Rahkaturve (St) RT
    195514, 1, // Turvetuotantoalue (Tu) RT
    0,
];
export const fieldPlotHistosolRatio = [
    '+',
    ['*', fieldPlotHistosolMult(["get", "soil_type1"]), ["max", 0, ["get", "soil_type1_ratio"]]],
    ['*', fieldPlotHistosolMult(["get", "soil_type2"]), ["max", 0, ["get", "soil_type2_ratio"]]],
];

// Unit: tons of CO2e per hectare per annum.
const fieldPlotCO2ePerHectare = [
    "case", [">=", fieldPlotHistosolRatio, 0.4], 20, 2.2,
];

export const fieldPlotTextField: Expression = [
    "step", ["zoom"],

    // 0 <= zoom < 15.5:
    [
        "case", [">=", fieldPlotHistosolRatio, 0.4], [
            "concat", histosolCalc, " t/y",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat", nonHistosolCalc, " t/y",
        ],
    ],

    // zoom >= 15.5:
    15.5,
    [
        "case", [">=", fieldPlotHistosolRatio, 0.4], [
            "concat",
            histosolCalc,
            "t CO2e/y",
            '\nsoil: histosol',
            // "\npeat:", ["/", ["round", ['*', 0.001, ['to-number', ["get", "histosol_area"], 0]]], 10], 'ha',
            "\narea: ", ["/", ["round", ['*', 0.1, ["get", "pinta_ala"]]], 10], "ha",
        ], [ // else: non-histosol (histosol_area < 50%)
            "concat",
            nonHistosolCalc,
            "t CO2e/y",
            '\nsoil: mineral',
            "\narea: ", ["/", ["round", ['*', 0.1, ["get", "pinta_ala"]]], 10], "ha",
        ],
    ],
];

// kg/ha/year
const turkuAuraJokiEmissions = {
    untreated: {
        totN: 16.5, totP: 1.3, PP: 1.0, DRP: 0.4, solidMatter: 696,
    },
    treated: {
        totN: 4.5, totP: 1.86, PP: 0.95, DRP: 0.91, solidMatter: 570,
    },
};

// Simplified to be small enough to be included inline.
// SELECT ST_AsGeoJSON(ST_Simplify(wkb_geometry,0.01)) FROM aura_joki_value; -- EPSG:4326
//
// The region was obtained from:
// https://metsakeskus.maps.arcgis.com/apps/webappviewer/index.html?id=4ab572bdb631439d82f8aa8e0284f663
// Also http://paikkatieto.ymparisto.fi/value/ (but it crashes the browser pretty easily!)
const turkuAuraJokiValue = { "type": "Polygon", "coordinates": [[[22.6103877990383, 60.6344856066462], [22.5870539729996, 60.6103588211101], [22.6233478269874, 60.5751045114842], [22.6081371120958, 60.5626995848525], [22.6246074790853, 60.5589631167027], [22.611648617642, 60.5406368750108], [22.6314716339555, 60.5150340334038], [22.6092672609967, 60.4938538962352], [22.4821141856954, 60.4683242152806], [22.4659206330005, 60.450887946384], [22.3802794072847, 60.4674571656726], [22.3552912683436, 60.4536851421538], [22.3834536221754, 60.4463719123733], [22.3751925022249, 60.4285164369009], [22.3333390617128, 60.4151056439502], [22.3043323282709, 60.4346888430041], [22.2864479797805, 60.4347006782323], [22.2854431135939, 60.416082779118], [22.2287674601729, 60.4333815276613], [22.2759013480459, 60.4641676815831], [22.2655255299015, 60.4711140245897], [22.2847212938923, 60.495795969575], [22.2673139070335, 60.5176149346882], [22.3275866631243, 60.5391575071753], [22.2614068872664, 60.5673420543226], [22.2678055710792, 60.5790404344835], [22.3609367082758, 60.5887055316531], [22.3772772685066, 60.603266563484], [22.3587439869585, 60.6056855294338], [22.4099654349429, 60.6259246878061], [22.3993092976892, 60.6329568465254], [22.4175178677525, 60.6469925120255], [22.5366813830571, 60.6510082108548], [22.5450098508632, 60.6360496225363], [22.6117183453645, 60.6535058093237], [22.6103877990383, 60.6344856066462]]] };
const turkuAuraJokiValueFeature = turfFeature(turkuAuraJokiValue);

const gtkLukeSoilTypes = {
    // Placeholder value:
    "-1": null,

    // LUKE.fi soil types (soilOfFinland2015):
    "-101": 'Anthrosols',
    "-102": 'Arenosols/Podzols',
    "-103": 'Gleysols',
    "-104": 'Histosols',
    "-105": 'Leptosols',
    "-106": 'Podzols',
    "-107": 'Podzols/Arenosols',
    "-108": 'Regosols',
    "-109": 'Stagnosols',

    // GTK.fi soil types (mp20k_maalajit):
    195111: 'Kalliomaa (Ka) RT',
    195112: 'Rakka (RaKa) RT',
    195113: 'Rapakallio (RpKa) RT',
    195213: 'Soramoreeni (SrMr) RT',
    195214: 'Hiekkamoreeni (Mr) RT',
    195215: 'Hienoainesmoreeni (HMr) RT',
    195311: 'Lohkareita (Lo) RT',
    195312: 'Kiviä (Ki) RT',
    195313: 'Sora (Sr) RT',
    195314: 'Hiekka (Hk) RT',
    195315: 'karkea Hieta (KHt) RT',
    195411: 'hieno Hieta (HHt) RT',
    195412: 'Hiesu (Hs) RT',
    195413: 'Savi (Sa) RT',
    195511: 'Lieju (Lj) RT',
    195512: 'Saraturve (Ct) RT',
    195513: 'Rahkaturve (St) RT',
    195514: 'Turvetuotantoalue (Tu) RT',
    195601: 'Täytemaa (Ta)',
    195602: 'Kartoittamaton (0)',
    195603: 'Vesi (Ve)',
    19531421: 'liejuinen Hiekka (LjHk) RT',
    19531521: 'liejuinen Hieta (karkea) (LjHt) RT',
    19541121: 'liejuinen hieno Hieta (LjHHt) RT',
    19541221: 'Liejuhiesu (LjHs) RT',
    19541321: 'Liejusavi (LjSa) RT',
};

export const setupPopupHandlerForMaviPeltolohko = (title, layerName) => {
    genericPopupHandler(layerName, ev => {
        const f = ev.features[0];
        const { soil_type1, soil_type1_ratio, soil_type2, soil_type2_ratio, pinta_ala } = f.properties;
        const areaHa = 0.01 * +pinta_ala;

        // Sometimes there's overlapping data so the sum is > 100%.
        // However, the data itself is coarse-grained so normalizing
        // the ratios to 100% is justified.
        // The error is within the bounds of data accuracy anyway
        // (and this only applies to small % of cases anyway).
        const normalizedSoilRatio = (
            soil_type2_ratio <= 0 ? 1 : soil_type1_ratio / (soil_type1_ratio + soil_type2_ratio)
        );
        const normalizedSoilRatioPct = Math.round(100 * normalizedSoilRatio);
        let html = `<strong>${title}</strong><br/>`
        if (soil_type1 !== -1) {
            html += `
                Primary soil: ${gtkLukeSoilTypes[soil_type1]} (${normalizedSoilRatioPct} %)
                <br/>
            `;
        }
        if (soil_type2 !== -1 && normalizedSoilRatioPct <= 99) {
            html += `
            Secondary soil: ${gtkLukeSoilTypes[soil_type2]} (${100 - normalizedSoilRatioPct} %)
            <br/>
            `;
        }
        html += `
            Area: ${pp(areaHa, 3)} hectares
            <br/>
            Emission reduction potential: ${pp(fieldPlotCO2eFn(f.properties))} tons CO₂e per year
        `;

        // Simplification: The field is in the catchment area if any part of it is.
        const inTurkuAurajokiCatchmentArea = turfFlattenReduce(
            // @ts-ignore TODO
            turfFeature(f.geometry),
            (v, feature) => v || turfBooleanWithin(feature, turkuAuraJokiValueFeature),
            false
        );

        const e = turkuAuraJokiEmissions;
        if (inTurkuAurajokiCatchmentArea) {
            html += `
            <hr/>
            <abbr class="tooltip" title="Väisänen & Puustinen (toim.), 2010">Current material emissions to the Aura river</abbr>:<br/>
            Nitrogen: ${pp(e.untreated.totN * areaHa)} kg per year<br/>
            Phosphorus: ${pp(e.untreated.totP * areaHa)} kg per year<br/>
            Solid matter: ${pp(e.untreated.solidMatter * areaHa)} kg per year<br/>

            <abbr class="tooltip" title="Puustinen ym. (2005), Puustinen (2013)">Potential emission reductions</abbr>:<br/>
            Nitrogen: ${pp((e.untreated.totN - e.treated.totN) * areaHa)} kg per year<br/>
            Phosphorus: ${pp((e.untreated.totP - e.treated.totP) * areaHa)} kg per year (a small increase)<br/>
            Solid matter: ${pp((e.untreated.solidMatter - e.treated.solidMatter) * areaHa)} kg per year<br/>
            `;
        }

        createPopup(ev, html, { maxWidth: '360px' });
    });
}

export const fieldColorHistosol = 'rgb(148, 114, 81)';
export const fieldColorDefault = 'hsla(52, 100%, 50%, 1)';
