import { Expression } from 'mapbox-gl'
import { registerGroup } from '../layer_groups'
import { addLayer, addSource, map } from '../map'

const URL_PREFIX = `https://server.avoin.org/data/map/fi-ffd`

const attribution = `
<i><a class="a-light" xmlns:dct="http://purl.org/dc/terms/" href="https://s2maps.eu" property="dct:title">Sentinel-2 cloudless - https://s2maps.eu</a>
by <a class="a-light" xmlns:cc="http://creativecommons.org/ns#" href="https://eox.at" property="cc:attributionName" rel="cc:attributionURL">
EOX IT Services GmbH
</a> (Contains modified Copernicus Sentinel data 2019)</i>
`

addLayer({
    'id': 's2-cloudless-at-eox-wms',
    'type': 'raster',
    'source': {
        'type': 'raster',
        'tiles': [
            'https://tiles.maps.eox.at/wms?bbox={bbox-epsg-3857}&format=image/png&service=wms&version=1.1.1&request=GetMap&srs=EPSG:3857&transparent=true&width=1024&height=1024&layers=s2cloudless-2019_3857&styles=default'
        ],
        'tileSize': 1024,
        // Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License.
        // https://s2maps.eu/
        attribution,
    },
    'paint': {},
    BEFORE: 'BG_LABEL',
})

interface GeoBoundariesProperies {
    "shapeName": string;
    "shapeISO": string;
    "shapeID": string;
    "shapeGroup": string;
    "shapeType": string;
}
interface FFDCaseStudyArea {
    name: string;
    zoom: number;
    center: number[];
    areas: GeoBoundariesProperies[];
}

export const ffdCaseStudyAreas: FFDCaseStudyArea[] = [
    {"name": "Maraka, Webuye, Kenya", "zoom": 9, "center": [34.7622051, 0.58430105], "areas": [{"shapeName": "Maraka", "shapeISO": "None", "shapeID": "KEN-ADM3-3_0_0-B170/Maraka", "shapeGroup": "KEN", "shapeType": "ADM3"}]},
    {"name": "Codajás, Brazil", "zoom": 6, "center": [-63.092999999999996, -3.1290000000000004], "areas": [{"shapeName": "Codaj\u00c3\u00a1s", "shapeISO": "None", "shapeID": "BRA-ADM2-3_0_0-B5027", "shapeGroup": "BRA", "shapeType": "ADM2"}]},
    {"name": "Diana, Madagascar", "zoom": 6, "center": [48.7623536, -13.1086601], "areas": [{"shapeName": "Diana", "shapeISO": "None", "shapeID": "MDG-ADM1-3_0_0-B1", "shapeGroup": "MDG", "shapeType": "ADM1"}]},
    {"name": "Choma, Zambia", "zoom": 7.5, "center": [27.1801379, -16.8605418], "areas": [{"shapeName": "Choma", "shapeISO": "None", "shapeID": "ZMB-ADM2-3_0_0-B5", "shapeGroup": "ZMB", "shapeType": "ADM2"}]},
    {"name": "Multiple areas, Vietnam", "zoom": 6, "center": [106.17696165, 18.6379023], "areas": [{"shapeName": "Bac Kan", "shapeISO": "VN-53", "shapeID": "VNM-ADM1-3_0_0-B4", "shapeGroup": "VNM", "shapeType": "ADM1"}, {"shapeName": "Hoa Binh", "shapeISO": "VN-14", "shapeID": "VNM-ADM1-3_0_0-B29", "shapeGroup": "VNM", "shapeType": "ADM1"}, {"shapeName": "Quang Ngai", "shapeISO": "VN-29", "shapeID": "VNM-ADM1-3_0_0-B47", "shapeGroup": "VNM", "shapeType": "ADM1"}, {"shapeName": "Son La", "shapeISO": "VN-05", "shapeID": "VNM-ADM1-3_0_0-B51", "shapeGroup": "VNM", "shapeType": "ADM1"}, {"shapeName": "Yen Bai", "shapeISO": "VN-06", "shapeID": "VNM-ADM1-3_0_0-B63", "shapeGroup": "VNM", "shapeType": "ADM1"}]},
    {"name": "Zamboanga Sibugay, Philippines", "zoom": 9, "center": [122.6581116, 7.605479949999999], "areas": [{"shapeName": "Zamboanga Sibugay", "shapeISO": "None", "shapeID": "PHL-ADM2-3_0_0-B81", "shapeGroup": "PHL", "shapeType": "ADM2"}]},
    {"name": "Trias Bicol, Philippines", "zoom": 9, "center": [123.41598955, 13.7431427], "areas": [{"shapeName": "Calabanga", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B528", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "Goa", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B535", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "Lagonoy", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B537", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "Naga City", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B544", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "Ocampo", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B545", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "Pili", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B548", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "Sag\u00f1ay", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B551", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "San Jose", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B553", "shapeGroup": "PHL", "shapeType": "ADM3"}, {"shapeName": "Tigaon", "shapeISO": "None", "shapeID": "PHL-ADM3-3_0_0-B556", "shapeGroup": "PHL", "shapeType": "ADM3"}]},
    {"name": "Kloto, Togo", "zoom": 9, "center": [0.63564135, 6.9439041], "areas": [{"shapeName": "Kloto", "shapeISO": "None", "shapeID": "TGO-ADM2-3_0_0-B35", "shapeGroup": "TGO", "shapeType": "ADM2"}]},
    {"name": "Niayes region, Senegal", "zoom": 7.5, "center": [-16.6215507, 15.4094848],"areas": [{"shapeName": "Ndande", "shapeISO": "None", "shapeID": "SEN-ADM3-3_0_0-B52", "shapeGroup": "SEN", "shapeType": "ADM3"}, {"shapeName": "Sakal", "shapeISO": "None", "shapeID": "SEN-ADM3-3_0_0-B72", "shapeGroup": "SEN", "shapeType": "ADM3"}, {"shapeName": "Rao", "shapeISO": "None", "shapeID": "SEN-ADM3-3_0_0-B101", "shapeGroup": "SEN", "shapeType": "ADM3"}, {"shapeName": "Keur Moussa", "shapeISO": "None", "shapeID": "SEN-ADM3-3_0_0-B112", "shapeGroup": "SEN", "shapeType": "ADM3"}, {"shapeName": "Pambal", "shapeISO": "None", "shapeID": "SEN-ADM3-3_0_0-B116", "shapeGroup": "SEN", "shapeType": "ADM3"}, {"shapeName": "Meouane", "shapeISO": "None", "shapeID": "SEN-ADM3-3_0_0-B117", "shapeGroup": "SEN", "shapeType": "ADM3"}]},
    {"name": "Bante and Savalou, Benin", "zoom": 9, "center": [1.87682145, 8.0929545], "areas": [{"shapeName": "Bante", "shapeISO": "None", "shapeID": "BEN-ADM2-3_0_0-B14", "shapeGroup": "BEN", "shapeType": "ADM2"}, {"shapeName": "Savalou", "shapeISO": "None", "shapeID": "BEN-ADM2-3_0_0-B58", "shapeGroup": "BEN", "shapeType": "ADM2"}]},
    {"name": "Comudidad Carmencita, Santa Cruz, Bolivia", "zoom": 12, "center": [-61.031959, -16.297455], "areas": [{"shapeName": "San Ignacio", "shapeISO": "None", "shapeID": "BOL-ADM3-3_0_0-B294", "shapeGroup": "BOL", "shapeType": "ADM3"}]},

    {"name": "Kenya", "zoom": 5, "center": [33.4096602,0.1540843], "areas": []},
    {"name": "Uganda", "zoom": 6, "center": [30.0585486,1.3671057], "areas": []},
    {"name": "Tanzania", "zoom": 5, "center": [30.4914209,-6.3533541], "areas": []},
    {"name": "Rwanda", "zoom": 8, "center": [29.319943,-1.9435638], "areas": []},
]

const geoboundariesAttribution = `Administrative boundaries courtesy of <a href="https://www.geoboundaries.org">geoBoundaries</a>`

const countryIsos = [
    'KEN',
    'VNM',
    'BRA',
    'TGO',
    'MDG',
    'BEN',
    'PHL',
    'SEN',
    'ZMB',
    'BOL',
    'RWA',
    'TZA',
    'UGA',
]

const lineWidth: Expression = [
  "step", ["zoom"],
  5, // 0..5:  5px
  5, 8, // 5+: 8px
]

addSource('fi-ffd-case-study-areas', {
  "type": 'geojson',
  'data': `${URL_PREFIX}/case_study_areas.geojson?v=1`,
  attribution: geoboundariesAttribution,
})

for (const countryIso of countryIsos) {
    addSource(`geoboundaries-adm0-${countryIso}`, {
        "type": 'geojson',
        'data': `${URL_PREFIX}/geoBoundariesSSCGS-3_0_0-${countryIso}-ADM0.geojson?v=1`,
        attribution: geoboundariesAttribution,
    })
    addLayer({
        'id': `fi-ffd-geoboundaries-adm0-${countryIso}-boundary`,
        'source': `geoboundaries-adm0-${countryIso}`,
        'type': 'line',
        'paint': {
            'line-width': lineWidth,
            'line-color': '#fff',
        },
        BEFORE: 'LABEL',
    })

    addLayer({
      'id': `fi-ffd-case-study-areas-${countryIso}-boundary`,
      'source': 'fi-ffd-case-study-areas',
      'type': 'line',
      'minzoom': 4,
      'paint': {
          // 'line-opacity': 0.5,
          'line-width': lineWidth,
          'line-color': [
            'case',
            ['==', ['get', 'shapeGroup'], 'SEN'], '#9e2c00', // Senegal is difficult to see without adjustments
            '#f5b400',
          ],
      },
      'filter': ['==', ['get', 'shapeGroup'], countryIso],
      BEFORE: 'TOP',
  })
}


const countryLayers = countryIsos.map(countryIso => `fi-ffd-geoboundaries-adm0-${countryIso}-boundary`)
const caseStudyAreas = countryIsos.map(countryIso => `fi-ffd-case-study-areas-${countryIso}-boundary`)


addLayer({
    'id': 'fi-ffd-case-study-areas-sym',
    'source': 'fi-ffd-case-study-areas',
    'type': 'symbol',
    'paint': {
        'text-color': "#999",
        'text-halo-blur': 1,
        'text-halo-color': "rgb(242,43,40)",
        'text-halo-width': 2,
    },
    "layout": {
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-size": 20,
        "text-field": ["get", "shapeName"],
    },
    BEFORE: 'LABEL',
})

registerGroup('fi-ffd', [
  's2-cloudless-at-eox-wms',
  'fi-ffd-case-study-areas-sym',
  ...caseStudyAreas,
  ...countryLayers,
])

if (process.env.NODE_ENV === 'development') {
  const allLayers = countryLayers.concat(caseStudyAreas)
  // @ts-ignore
  window.fi_ffd_show_country = (selectedIsos: string[]) => {
    allLayers.forEach(layerId => {
      const shown = selectedIsos.filter(iso => layerId.includes(iso)).length > 0
      map.setLayoutProperty(layerId, 'visibility', shown ? 'visible' : 'none');
    })
  }
  // @ts-ignore
  window.fi_ffd_show_case_study_area = (selectedIsos: string[]) => {
    allLayers.forEach(layerId => {
      const shown = selectedIsos.filter(iso => layerId.includes(iso)).length > 0 && !countryLayers.includes(layerId)
      map.setLayoutProperty(layerId, 'visibility', shown ? 'visible' : 'none');
    })
  }
  // @ts-ignore
  window.fi_ffd_show_country_only = (selectedIsos: string[]) => {
    allLayers.forEach(layerId => {
      const shown = selectedIsos.filter(iso => layerId.includes(iso)).length > 0 && !caseStudyAreas.includes(layerId)
      map.setLayoutProperty(layerId, 'visibility', shown ? 'visible' : 'none');
    })
  }
}
