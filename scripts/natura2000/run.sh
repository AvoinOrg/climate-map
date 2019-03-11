#!/usr/bin/env bash
set -Eeuxo pipefail

# See: http://metatieto.ymparisto.fi:8080/geoportal/catalog/search/resource/details.page?uuid=%7B36FA93DC-F156-427E-973E-E83F7AFC6306%7D

# SPA = Special Protection Areas, Lintudirektiivin mukaiset erityiset suojelualueet 
# SAC = Special Areas of Conservation, Erityisen suojelutoimien alue luontodirektiivin mukaisesti 
# SCI = Sites of Community Importance, Jäsenvaltion ehdotus luontodirektiivin perusteella suojeltavaksi alueeksi. 
#
# Natura-alueiden toteuttamistaparajaukset on tallennettu erilliseen Natura 2000 toteuttamistapa -aineistoon,
# joka on luonteeltaan varsinaisia Natura-kohteita täydentävä.
# Toteuttamistapa-aineistoa tulee aina tarkastella varsinaisten Natura-rajausten kanssa.
#

# Layer name: NaturaSAC_alueet
    # naturaTunn: String (9.0)
    # suojeluPer: String (15.0)
    # versioTunn: Date (10.0)
    # nimiSuomi: String (150.0)
    # nimiRuotsi: String (150.0)
    # alueTyyppi: String (10.0)
    # tietolomak: String (254.0)
    # paatosPvm: Date (10.0)
    # paatosPAla: Real (19.11)
    # paatosPitu: Real (19.11)
    # meriPAlaPr: Real (19.11)
    # paatosAsia: String (230.0)
    # ensisijLaj: Integer64 (10.0)
    # alueJaViiv: Integer64 (10.0)
    # VPDSuoj: Integer64 (10.0)
    # lisatieto: String (200.0)
    # luontiPvm: Date (10.0)
    # muutosPvm: Date (10.0)
    # paattymisP: Date (10.0)
    # SHAPE_STAr: Real (19.11)
    # SHAPE_STLe: Real (19.11)
# Layer name: NaturaSAC_viivat
    ## Same as NaturaSAC_alueet, without SHAPE_STAr.
# Layer name: NaturaSCI_alueet
    ## Same as NaturaSAC_alueet
# Layer name: NaturaSPA_alueet
    ## Same as NaturaSAC_alueet

# Layer name: NaturaTotTapa_ma
    # NaturaTunn: String (9.0)
    # Nimi: String (150.0)
    # SuiojeluPe: String (9.0)    NB: typo in source
    # VnPaatosTo: String (200.0)
    # TotTapa: String (50.0)
    # Lisatieto: String (100.0)
    # MuutosPvm: Date (10.0)
    # Shape_STAr: Real (19.11)    NB: not in NaturaTotTapa_r
    # Shape_STLe: Real (19.11)
# Layer name: NaturaTotTapa_r
    # NaturaTunn: String (9.0)
    # Nimi: String (150.0)
    # SuojeluPer: String (9.0)
    # VnPaatosTo: String (200.0)
    # TotTapa: String (50.0)
    # Lisatieto: String (100.0)
    # MuutosPvm: Date (10.0)
    # Shape_STLe: Real (19.11)

ogr_url=/vsizip//vsicurl/http://wwwd3.ymparisto.fi/d3/gis_data/spesific/natura.zip

ogrinfo -ro -al -so "$ogr_url" | grep ^Layer.name | sed 's/.*://' |
while read -r layer; do
    echo $layer
    ogr2ogr \
        -f GeoJSON \
        -t_srs epsg:4326 \
        -mapFieldType date=string,datetime=string \
        -sql "select *, cast(substr(NaturaTunn, 3) as integer) as id from $layer where NaturaTunn is not null" \
        "$layer.geojson" \
        "$ogr_url"
done

tippecanoe \
    -zg \
    --no-tile-compression \
    --output-to-directory=natura2000-tiles/ \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --use-attribute-for-id=id \
    *.geojson
