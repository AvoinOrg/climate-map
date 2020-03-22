import { addSource, addLayer, genericPopupHandler, createPopup } from '../map'
import { fillOpacity } from '../utils'

addSource('fi-mml-suot', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/fi-mml-suot/{z}/{x}/{y}.pbf.gz?v=5"],
    "minzoom": 0,
    "maxzoom": 11,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="http://mml.fi/">© National Land Survey of Finland</a>',
});

addLayer({
    'id': 'fi-mml-suot-fill',
    'source': 'fi-mml-suot',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': 'orange',
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})

/* Attributes in 'gtk-turvevarat':
suon_id suon_nimi n e korkeus_mmpy_min korkeus_mmpy_max
korkeustiedon_lahde kunta tutkimusvuosi luonnontilaisuusluokka
luonnontilaisuusluokka_txt turvekerroksen_keskisyvyys_m
suon_turvemaara_mm3 turpeen_keskimaatuneisuus yli150_pinta_ala_ha
yli150_turvemaara_mm3 yli150_h14_turvemaara_mm3 tuhka_p
tuhka_txt rikki_p rikki_txt kuiva_aine_kg_suom3 kuiva_aine_txt
lampoarvo_teholl_mj_kg lampoarvo_teholl_txt lampoarvo_50pkost_mj_kg
lampoarvo_50pkost_txt vesipitoisuus_p vesipitoisuus_txt ph
ph_txt suon_pinta_ala_ha paaturvelaji rahkaturpeet_p saraturpeet_p
ruskosammalturpeet_p savi_p hiesu_p hieta_p hiekka_p sora_p kallio_p
moreeni_p avosuot korvet letot rameet turvekankaat muut ei_maaritetty

+ 'photos_json'
*/

/* Attribute luonnontilaisuusluokka:
Source: http://gtkdata.gtk.fi/Turvevarojen_tilinpito/luonnontilaisuusluokat.html

5	Suolla ja sen välittömässä läheisyydessä ei häiriötekijöitä. Suokasvillisuus vallitsee aluskasvillisuudessa (pl. Luontaisesti ruoppaiset tai pohjakerrokseltaan sulkeutumattomat suotyypit). Osassa keidassoiden laiteita voi olla vähäisiä kasvillisuuden muutoksia. Vedenpinta kullekin suopinnan tasolle tyypillisissä rajoissa.
4	Suon välittömässä läheisyydessä tai reunassa häiriö(itä), esim. ojia, tie tms., jotka eivät aiheuta näkyvää muutosta suolla. Osassa keidassoiden laiteita voi kuitenkin olla vesitalouden muutoksia. Suokasvillisuus vallitsee aluskasvillisuudessa (pl. Luontaisesti ruoppaiset tai pohjakerrokseltaan sulkeutumattomat suotyypit). Osassa keidassoiden laiteita voi olla vähäisiä kasvillisuuden muutoksia. Vedenpinta kullekin suopinnan tasolle tyypillisissä rajoissa.
3	Valtaosa suosta ojittamatonta. Aapasuon reunaojitus ei kauttaaltaan estä vesien valumista suolle eikä luonnollista vaihettumista kangasmetsään (tms.); merkittävää kuivahtamista ei suon muissa osissa. Keidassoiden laideosissa voi olla laajalti vesitalouden muutoksia. Suokasvillisuudessa ei muutoksia suon reunavyöhykettä lukuun ottamatta. Keidassoilla laiteella puuvartisten kasvien osuus voi olla merkittävästi lisääntynyt. Suoveden pinta alentunut ojien tuntumassa, joskus myös suon pinta.
2	Suolla ojitettuja ja ojittamattomia osia. Ojitus estää hydrologisen yhteyden suon ja ympäristön välillä. Osalla ojittamatonta alaa kuivahtamista. Keidassoilla ojitus on muuttanut myös reunaluisun ja keskustan vesitaloutta. Suolle tyypillinen kasvistoaines kärsinyt; varpuisuus voi olla lisääntynyt välipinnoilla; merkkejä puuston kasvun lisääntymisestä tai taimettumisesta. Osalla suon ojittamatonta alaa kasvillisuusmuutoksia. Keidassoiden keskiosien muutokset voivat laidetta lukuun ottamatta olla vähäisiä. Suoveden pinta voi olla hivenen alentunut kauempanakin ojista, jos ne ovat "puhkaisseet" laajoja rimpiä tai keidassoiden kuljuja taikka allikoita. Suon ennallistamisen tai suolle tulevien pisto-ojien aiheuttamat taikka esim. penkkateiden patoamat vettymät kuuluvat tähän luokkaan.
1	Vesitalous muuttunut kauttaaltaan, kasvillisuusmuutokset selviä. Puuston kasvu selvästi lisääntynyt ja/ tai alue taimettunut/ metsittynyt. Kasvillisuusmuutokset voivat kauttaaltaan ojitetuillakin alueilla olla hitaita. Alue voi olla myös jäkälöitynyt tai karhunsammaloitunut vailla merkittävää puustokerrosta.
0	Muuttunut peruuttamattomasti: vesitalous muuttunut, kasvillisuuden muutos edennyt pitkälle. Kasvillisuus muuttunut kauttaaltaan ja sen kehitys osissa tapauksista edennyt turvekangasvaiheeseen. Suoveden pinta kauttaaltaan alentunut.
*/

const gtkTurveVaratLuonnontilaisuusluokka = {
    "-1": 'Unclassified',
    0: 'Irreversible changes',
    1: 'Water flow thoroughly changed and there are clear changes to the vegetation',
    2: 'Contains drained and non-drained parts',
    3: 'Most of the bog is non-drained',
    4: 'Immediate vicinity of the bog contains non-visible sources of disruption like ditches and roads',
    5: 'The bog is in its natural state',
}

addSource('gtk-turvevarat', {
    "type": "vector",
    "tiles": ["https://map.buttonprogram.org/gtk-turvevarat-suot/{z}/{x}/{y}.pbf.gz?v=5"],
    "minzoom": 0,
    "maxzoom": 14,
    bounds: [19, 59, 32, 71], // Finland
    attribution: '<a href="http://www.gtk.fi/">© Geological Survey of Finland</a>',
});

addLayer({
    'id': 'gtk-turvevarat-suot-fill',
    'source': 'gtk-turvevarat',
    'source-layer': 'default',
    'type': 'fill',
    'paint': {
        'fill-color': [
            'case', ['==', null, ['get', 'photos_json']], 'red', 'orange',
        ],
        // 'fill-color': fillColorFertilityClass,
        // 'fill-color': fillRegenerationFelling,
        'fill-opacity': fillOpacity,
    },
    BEFORE: 'FILL',
})
genericPopupHandler('gtk-turvevarat-suot-fill', e => {
    let html = '';
    for (const f of e.features) {
        const p = f.properties;
        html += `
        Name: ${p.suon_nimi}<br/>
        Surveyed: ${p.tutkimusvuosi}<br/>
        Area: ${p.suon_pinta_ala_ha} ha<br/>
        Peat volume: ${p.suon_turvemaara_mm3} million cubic metres<br/>
        Average peat depth: ${p.turvekerroksen_keskisyvyys_m} metres<br/>
        Evaluation of how close the bog is to its natural state (class ${
            p.luonnontilaisuusluokka === -1 ? '?' : p.luonnontilaisuusluokka
            } out of 5):<br/> ${gtkTurveVaratLuonnontilaisuusluokka[p.luonnontilaisuusluokka]}<br/>
        `;

        if (!p.photos_json) { continue; }

        html += '<div style="overflow:scroll; max-height: 500px">';
        const photos = JSON.parse(p.photos_json);
        for (const x of photos) {
            const { kuva_id, kuvausaika, kuvaaja } = x;
            const imageURL = `https://gtkdata.gtk.fi/Turvevarojen_tilinpito/Turve_valokuvat/${kuva_id}.jpg`;
            html += `<p>
            <a target="_blank" href="${imageURL}">
                <img style="max-width:200px; max-height:150px;" src="${imageURL}"/>
            </a>
            <br/>
            Date: ${kuvausaika.toLowerCase() === 'tuntematon' ? 'Unknown' : kuvausaika}
            <br/>
            Photographer: ${kuvaaja}
            </p>`;
        }
        html += '</div>';
    }

    createPopup(e, html)
});
