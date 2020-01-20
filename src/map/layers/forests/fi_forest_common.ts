import { pp } from '../../utils';
import { genericPopupHandler, createPopup } from '../../map';

const metsaanFiSoilTypes = [
    [10, 'Rough or medium grade soil of heathland', 'Keskikarkea tai karkea kangasmaa'],
    [11, 'Rough moraine', 'Karkea moreeni'],
    [12, '', 'Karkea lajittunut maalaji'],
    [20, '', 'Hienojakoinen kangasmaa'],
    [21, '', 'Hienoainesmoreeni'],
    [22, '', 'Hienojakoinen lajittunut maalaji'],
    [23, '', 'Silttipitoinen maalaji'],
    [24, 'Clay', 'Savimaa'],
    [30, 'Stony rough or medium grade soil of heathland', 'Kivinen keskikarkea tai karkea kangasmaa'],
    [31, 'Stony rough moraine', 'Kivinen karkea moreeni'],
    [32, '', 'Kivinen karkea lajittunut maalaji'],
    [40, '', 'Kivinen hienojakoinen kangasmaa'],
    [50, 'Rocky groud', 'Kallio tai kivikko'],
    [60, 'Peatland', 'Turvemaa'],
    [61, 'Carex peat', 'Saraturve'],
    [62, 'Sphagnum-peat', 'Rahkaturve'],
    [63, '', 'Puuvaltainen turve'],
    [64, '', 'Eroosioherkkä saraturve (von Post luokka yli 5)'],
    [65, '', 'Eroosioherkkä rahkaturve (von Post luokka yli 5)'],
    [66, '', 'Maatumaton saraturve (von Post luokka enintään 5)'],
    [67, '', 'Maatumaton rahkaturve (von Post luokka enintään 5)'],
    [70, 'Mold soil', 'Multamaa'],
    [80, 'Silt', 'Liejumaa'],
];

const metsaanFiDatasources = [
    { 'id': 1, 'code': '1', 'description': 'Maastossa mitattu' },
    { 'id': 2, 'code': '2', 'description': 'Kaukokartoitettu' },
    { 'id': 3, 'code': '3', 'description': 'Maastossa mitattu ja laskennallisesti kasvatettu' },
    { 'id': 4, 'code': '4', 'description': 'Kaukokartoitettu ja laskennallisesti kasvatettu' },
    { 'id': 5, 'code': '5', 'description': 'Taimikon perustamistiedosta laskennallisesti tuotettu uusi puusto' },
    { 'id': 6, 'code': '6', 'description': 'Kasvatettu laskennallisesti toteutuneen metsänhoitotyön perusteella' },
    { 'id': 7, 'code': '7', 'description': 'Kasvatettu laskennallisesti toteutuneen hakkuun perusteella' },
    { 'id': 8, 'code': '9', 'description': 'Puustotieto muodostettu eri lähteitä yhdistäen / ei määritelty' },
    { 'id': 9, 'code': '10', 'description': 'Metsävaratiedonkeruu' },
    { 'id': 10, 'code': '11', 'description': 'Metsävaratiedonkeruu, Aarni' },
    { 'id': 11, 'code': '12', 'description': 'Metsävaratiedonkeruu, Luotsi' },
    { 'id': 12, 'code': '13', 'description': 'Metsävaratiedonkeruu, TASO' },
    { 'id': 13, 'code': '14', 'description': 'Metsävaratiedonkeruu, muu MV-järjestelmä' },
    { 'id': 14, 'code': '20', 'description': 'Metsäsuunnittelu' },
    { 'id': 15, 'code': '21', 'description': 'Metsäsuunnittelu, uusi MS-järjestelmä' },
    { 'id': 16, 'code': '22', 'description': 'Metsäsuunnittelu, Luotsi' },
    { 'id': 17, 'code': '23', 'description': 'Metsäsuunnittelu, TASO' },
    { 'id': 18, 'code': '24', 'description': 'Metsäsuunnittelu, muu MS-järjestelmä' },
    { 'id': 19, 'code': '30', 'description': 'Arvokas elinympäristö' },
    { 'id': 20, 'code': '31', 'description': 'Arvokas elinympäristö, metsälaki' },
    { 'id': 21, 'code': '32', 'description': 'Arvokas elinympäristö, luonnonsuojelulaki' },
    { 'id': 22, 'code': '33', 'description': 'Arvokas elinympäristö, metsäsertifiointi' },
    { 'id': 23, 'code': '34', 'description': 'Arvokas elinympäristö, muu arvokas elinympäristö' },
    { 'id': 24, 'code': '35', 'description': 'Arvokas elinympäristö, METSO' },
    { 'id': 25, 'code': '36', 'description': 'Arvokas elinympäristö, ympäristötukikohde' },
    { 'id': 26, 'code': '101', 'description': 'Maastossa mitattu' },
    { 'id': 27, 'code': '102', 'description': 'Kaukokartoitettu' },
    { 'id': 28, 'code': '103', 'description': 'Taimikon perustamisilmoitus' },
    { 'id': 29, 'code': '104', 'description': 'Metsänkäyttöilmoitus' },
    { 'id': 30, 'code': '105', 'description': 'Monilähde-VMI' },
    { 'id': 31, 'code': '109', 'description': 'Metsävaratieto, ei määritelty' },
    { 'id': 32, 'code': '202', 'description': 'MKI-kuvio, suunniteltu hakkuu' },
    { 'id': 33, 'code': '212', 'description': 'MKI-kuvio, suunniteltu uudistaminen' },
    { 'id': 34, 'code': '213', 'description': 'MKI-kuvio, perustamistieto' },
    { 'id': 35, 'code': '201', 'description': 'TP-kuvio' },
    { 'id': 36, 'code': '203', 'description': 'TPI-kuvio' },
    { 'id': 37, 'code': '204', 'description': 'Kemera-kuvio' },
    { 'id': 38, 'code': '205', 'description': 'Luotsi-kuvio' },
    { 'id': 39, 'code': '206', 'description': 'Metsänomistaja' },
    { 'id': 40, 'code': '207', 'description': 'Toimija' },
    { 'id': 41, 'code': '208', 'description': 'Muu' },
];

const metsaanFiDevelopmentClass = {
    "02": 'Young growing forest',
    "03": 'Grown up growing forest',
    "04": 'Mature forest',
    "05": 'Shelterwood forest',
    "A0": 'Open land',
    "ER": 'Uneven-aged forest',
    "S0": 'Seed-tree stand',
    "T1": 'Recently planted forest under 1,3 m',
    "T2": 'Recently planted forest over 1,3 m',
    "Y1": 'Recently planted fores with hold-over trees',
};
const metsaanFiFertilityClass = {
    1: 'Grove, fen, grovy fen (and grassy peatland)',
    2: 'Grovy heathland, analogous fen and grovy peatland',
    3: 'Green heathland, analogous fen and blueberry peatland',
    4: 'dryish heathland, analogous fen and lingonberry peatland',
    5: 'dry heathland, analogous fen and shrub dry peatland',
    6: 'Barren heathland, analogous fen (and lichen peatland)',
    7: 'rocky groud and sandy ground',
    8: 'peak forest and fell',
};
const metsaanFiMainGroups = {
    1: 'Forest land',
    2: 'Low-productive forest land',
    3: 'Wasteland',
    4: 'Other forest management land',
    5: 'Lot',
    6: 'Agricultural land',
    7: 'Other land',
    8: 'Water land',
};
const metsaanFiSubgroups = {
    1: 'Heathland',
    2: 'Spruce peatland',
    3: 'Pine peatland',
    4: 'Peat bog',
    5: 'Fen',
};
export const metsaanFiTreeSpecies = {
    1: "Pine",
    2: "Spruce",
    3: "Silver birch",
    4: "Downy birch",
    5: "Asp",
    6: "Grey alder",
    7: "Black alder",
    8: "Other coniferous tree",
    9: "Other deciduous tree",
    10: "Oregon pine",
    11: "Common juniper",
    12: "Contorta pine",
    13: "European white elm",
    14: "Larch",
    15: "Small-leaved lime",
    16: "Black spruce",
    17: "Willow",
    18: "Rowan",
    19: "Fir",
    20: "Goat willow",
    21: "Ash",
    22: "Swiss pine",
    23: "Serbian spruce",
    24: "Oak",
    25: "Bird cherry",
    26: "Maple",
    27: "Curly birch",
    28: "Scots elm",
    29: "Deciduous tree",
    30: "Coniferous tree",
}
const metsaanFiAccessibilityClassifier = {
    1: 'All-year available',
    2: 'With melt soil but not during possible frost damage',
    3: 'Also smelt ground, but not rasputitsa',
    4: 'Only when soil is frozen',
    5: 'Not defined',
}

export const setupPopupHandlerForMetsaanFiStandData = layerName => {
    genericPopupHandler(layerName, e => {
        const f = e.features[0];
        const p = f.properties;

        const soilTypeInfo = metsaanFiSoilTypes.filter(x => x[0] === p.soiltype)[0];
        let soilEn = '', soilFi = '';
        if (soilTypeInfo) {
            // @ts-ignore
            soilEn = soilTypeInfo[1];
            // @ts-ignore
            soilFi = soilTypeInfo[2];
        }

        const ditching = p.ditch_completed_at || p.ditchingyear ?
            `Completed at: ${p.ditch_completion_date || p.ditchingyear}` :
            '';

        const html = `
            <table>
            <tr><th>Main tree species</th><td>${metsaanFiTreeSpecies[p.maintreespecies] || ''}</td></tr>
            <tr><th>Average tree age</th><td>${p.meanage} years</td></tr>
            <tr><th>Average tree trunk diameter</th><td>${p.meandiameter} cm</td></tr>
            <tr><th>Average tree height</th><td>${p.meanheight} m</td></tr>
            <tr><th>Soil</th><td>${soilEn || soilFi || ''}</td></tr>
            <tr><th>Area</th><td>${pp(p.area, 3)} hectares</td></tr>
            <tr><th>Accessibility</th><td>${metsaanFiAccessibilityClassifier[p.accessibility] || ''}</td></tr>
            <tr><th>Approx. tree stem count</th><td>${pp(p.stemcount * p.area)}</td></tr>
            <!-- <tr><th>TODO(Probably/Not/Yes/No): Mature enough for regeneration felling?</th><td>${p.regeneration_felling_prediction}</td></tr> -->
            <tr><th>Development class</th><td>${metsaanFiDevelopmentClass[p.developmentclass] || ''}</td></tr>
            <tr><th>Fertility classifier</th><td>${metsaanFiFertilityClass[p.fertilityclass] || ''}</td></tr>
            <tr><th>Main group</th><td>${metsaanFiMainGroups[p.maingroup] || ''}</td></tr>
            <tr><th>Subgroup</th><td>${metsaanFiSubgroups[p.subgroup] || ''}</td></tr>
            <tr><th>Ditching</th><td>${ditching}</td></tr>
            <tr><th>Data source</th><td>${metsaanFiDatasources.filter(x => x.id === p.datasource)[0].description || ''}</td></tr>
            <tr><th>Identifier</th><td>StandID=${p.standid}</td></tr>
        `;

        createPopup(e, html, { maxWidth: '360px' });
    });
}