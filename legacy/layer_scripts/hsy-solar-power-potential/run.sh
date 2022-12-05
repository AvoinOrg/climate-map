#!/usr/bin/env bash
set -Eeuo pipefail

base_url=https://www.hsy.fi/sites/AvoinData/AvoinData/SYT/Tietoyhteistyoyksikko/Aurinkos%C3%A4hk%C3%B6potentiaali

mkdir -p scratch/

# espoo had too many errors. Disabled.
for file in aurinkosahkopotentiaali_{hki,vantaa}.zip; do
    url=$base_url/$file
    # NB: cannot pipe the ZIP file to GDAL tools directly due to lack of server range request support.
    wget -O scratch/"$file" "$url"
    docker run --rm -i -v "$PWD/scratch:/scratch:ro" geographica/gdal2:2.4.0 \
        ogr2ogr -f GeoJSONSeq /vsistdout/ /vsizip//scratch/"$file"
done |
    tippecanoe \
     --coalesce-densest-as-needed \
     --hilbert \
     -zg  \
     --extend-zooms-if-still-dropping all.geojsons \
     --no-tile-compression \
     --output-to-directory tiles/ \
     --layer=solarpower_potential


exit 0 # Random notes below, not to be executed :)


layer_ogrinfo='
Layer name: Electricity
Metadata:
  DBF_DATE_LAST_UPDATE=2015-07-30
Geometry: Polygon
Feature Count: 87837
Extent: (25490714.513300, 6668657.899000) - (25513662.804800, 6687054.407000)
Layer SRS WKT:
PROJCS["ETRS89_ETRS_GK25FIN_2010",
    GEOGCS["GCS_ETRS_1989",
        DATUM["European_Terrestrial_Reference_System_1989",
            SPHEROID["Geodetic_Reference_System_of_1980",6378137.0,298.2572221008916]],
        PRIMEM["Greenwich",0.0],
        UNIT["Degree",0.0174532925199433]],
    PROJECTION["Transverse_Mercator"],
    PARAMETER["false_easting",25500000.0],
    PARAMETER["false_northing",0.0],
    PARAMETER["central_meridian",25.0],
    PARAMETER["scale_factor",1.0],
    PARAMETER["latitude_of_origin",0.0],
    UNIT["Meter",1.0]]
ELEC: Real (13.11)
CO2: Real (13.11)
'


# Problem 1: The kartta.hsy.fi download service did not work at all. It always returns 504 Gateway Timeout.
# Problem 2: The variable "CO2" is not documented
# Problem 3: aurinkosahkopotentiaali_espoo.zip has thousands of errors. The data got corrupted?
cat >/dev/null <<EOF
--2019-04-01 01:15:55--  https://www.hsy.fi/sites/AvoinData/AvoinData/SYT/Tietoyhteistyoyksikko/Aurinkos%C3%A4hk%C3%B6potentiaali/aurinkosahkopotentiaali_espoo.zip
Resolving www.hsy.fi (www.hsy.fi)... 193.64.12.7
Connecting to www.hsy.fi (www.hsy.fi)|193.64.12.7|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 7860056 (7.5M) [application/x-zip-compressed]
Saving to: ‘aurinkosahkopotentiaali_espoo.zip’

aurinkosahkopotentiaali_espoo.zip  100%[===================>]   7.50M  17.4MB/s    in 0.4s    

2019-04-01 01:15:56 (17.4 MB/s) - ‘aurinkosahkopotentiaali_espoo.zip’ saved [7860056/7860056]

Warning 1: Value '0.0  0.00000' of field Electricity.ELEC parsed incompletely to real 0.
Warning 1: Value 'e+000 0.00000' of field Electricity.CO2 parsed incompletely to real 0.
Warning 1: Value '0 0.00000e+00' of field Electricity.ELEC parsed incompletely to real 0.
Warning 1: Value '.10000e+004 1' of field Electricity.ELEC parsed incompletely to real 1000.
Warning 1: Value '577e+003 7.52' of field Electricity.CO2 parsed incompletely to real 577000.
Warning 1: Value '+000 0.00000e' of field Electricity.ELEC parsed incompletely to real 0.
Warning 1: Value '0 0.00000e+00' of field Electricity.CO2 parsed incompletely to real 0.
Warning 1: Value '.51904e+004 2' of field Electricity.CO2 parsed incompletely to real 5190.4.
Warning 1: Value '73e+003 2.309' of field Electricity.ELEC parsed incompletely to real 73000.
Warning 1: Value '4.23122e' of field Electricity.ELEC parsed incompletely to real 4.23122.
Warning 1: Value '+003 8.07233e' of field Electricity.CO2 parsed incompletely to real 3.
Warning 1: Value '89346e+002 5.' of field Electricity.ELEC parsed incompletely to real 8934600.
Warning 1: Value '00e+000 0.000' of field Electricity.CO2 parsed incompletely to real 0.
Warning 1: Value '0.00000e' of field Electricity.CO2 parsed incompletely to real 0.
Warning 1: Value '000 0.00000e+' of field Electricity.ELEC parsed incompletely to real 0.
...
Warning 1: Value '2826e+004 2.7' of field Electricity.ELEC parsed incompletely to real 28260000.
More than 1000 errors or warnings have been reported. No more will be reported from now.
EOF
