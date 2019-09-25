import { addSource, addLayer } from '../layer_groups'
import { fillOpacity, roundToSignificantDigits } from '../utils'

addSource('corine_clc2018', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/corine_clc2018_subset/{z}/{x}/{y}.pbf.gz"],
    "maxzoom": 10,
});
addLayer({
    'id': 'corine_clc2018-fill',
    'source': 'corine_clc2018',
    'source-layer': 'Clc2018_FI20m_subset',
    'type': 'fill',
    // filter: ['any', ['==', ['get', 'dn'], 20], ['==', ['get', 'dn'], 22],  ['==', ['get', 'dn'], 19]],
    filter: ['!=', ['get', 'dn'], 255],
    'paint': {
        'fill-color': [
            "match",
            ["get", "dn"],
            17, 'yellow', // pellot
            18, 'red', // Hedelmäpuu- ja marjapensasviljelmät
            19, 'orange', //Laidunmaat
            20, 'green', //Luonnon laidunmaat
            21, 'teal', //Maataloustukijärjestelmän ulkopuoliset maatalousmaat
            22, 'maroon', //Puustoiset pelto- ja laidunmaat

            31, 'blue',
            32, 'purple',

            43, 'brown',
            44, 'black',

            'white',
        ],
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
addLayer({
    'id': 'corine_clc2018-outline',
    'source': 'corine_clc2018',
    'source-layer': 'Clc2018_FI20m_subset',
    'type': 'line',
    "minzoom": 6,
    'paint': {
        'line-opacity': 0.5,
    },
    BEFORE: 'OUTLINE',
})

const corine2018ValueToLabel = v => [
    "match", v,
    1, "Continuous urban fabric",
    2, "Discontinuous urban fabric",
    3, "Commercial units",
    4, "Industrial units",
    5, "Road and rail networks and associated land",
    6, "Port areas",
    7, "Airports",
    8, "Mineral extraction sites",
    9, "Open cast mines",
    10, "Dump sites",
    11, "Construction sites",
    12, "Green urban areas",
    13, "Summer cottages",
    14, "Sport and leisure areas",
    15, "Golf courses",
    16, "Racecourses",
    17, "Non-irrigated arable land",
    18, "Fruit trees and berry plantations",
    19, "Pastures",
    20, "Natural pastures",
    21, "Arable land outside farming subsidies",
    22, "Agro-forestry areas",
    23, "Broad-leaved forest on mineral soil",
    24, "Broad-leaved forest on peatland",
    25, "Coniferous forest on mineral soil",
    26, "Coniferous forest on peatland",
    27, "Coniferous forest on rocky soil",
    28, "Mixed forest on mineral soil",
    29, "Mixed forest on peatland",
    30, "Mixed forest on rocky soil",
    31, "Natural grassland",
    32, "Moors and heathland ",
    33, "Transitional woodland/shrub  cc <10%  ",
    34, "Transitional woodland/shrub, cc 10-30%,on mineral soil",
    35, "Transitional woodland/shrub, cc 10-30%,  on peatland",
    36, "Transitional woodland/shrub, cc 10-30%,  on rocky soil",
    37, "Transitional woodland/shrub under power lines",
    38, "Beaches, dunes, and sand plains ",
    39, "Bare rock",
    40, "Sparsely vegetated areas",
    41, "Inland marshes, terrestrial",
    42, "Inland marshes, aquatic",
    43, "Peatbogs",
    44, "Peat production sites",
    45, "Salt marshes, terrestrial",
    46, "Salt marshes, aquatic",
    47, "Water courses",
    48, "Water bodies",
    49, "Sea and ocean",
    "",
]
addLayer({
    'id': 'corine_clc2018-sym',
    'source': 'corine_clc2018',
    'source-layer': 'Clc2018_FI20m_subset',
    'type': 'symbol',
    "minzoom": 14,
    "paint": {},
    "layout": {
        "text-size": 20,
        "symbol-placement": "point",
        "text-font": ["Open Sans Regular"],
        "text-field": [
            'concat',
            corine2018ValueToLabel(['get', 'dn']),
            '\n', roundToSignificantDigits(2, ['*', 1e-4, ['get', 'st_area']]), ' ha',
        ],
    },
    BEFORE: 'LABEL',
})
