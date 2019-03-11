#!/usr/bin/env bash
set -Eeuxo pipefail

if [[ ! $# = 1 ]]; do
    echo "Usage: $0 <plohko_cd_2017B_2_MapInfo_region.shp or equivalent>"
    exit 1
done

plohko_cd_2017B_2_MapInfo=$1
ogrinfo -ro -so -al "$plohko_cd_2017B_2_MapInfo"

#All features:
# ELY: String (2.0)
# KNRO: String (3.0)
# TILTU: String (9.0)    # NB: cannot show in a public dataset
# LOHKO: String (10.0)   # NB: cannot show in a public dataset
# PINTA_ALA: Real (14.2)
# YMPARYS: Real (14.2)

mkdir -p scratch/

ogr2ogr \
    -f GeoJSON \
    -t_srs epsg:4326 \
    -select ELY,KNRO,PINTA_ALA,YMPARYS \
    scratch/plohko_cd_2017B_2_MapInfo.geojson \
    "$plohko_cd_2017B_2_MapInfo"

tippecanoe \
    -zg \
    --no-tile-compression \
    --output-to-directory=tiles/ \
    --coalesce-densest-as-needed \
    --extend-zooms-if-still-dropping \
    --attribution="© Maaseutuvirasto 2018" \
    scratch/plohko_cd_2017B_2_MapInfo.geojson
