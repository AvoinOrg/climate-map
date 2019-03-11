#!/usr/bin/env bash
CLEAN=0
[[ $1 = clean ]] && CLEAN=1
set -Eeuo pipefail

tmp=$(mktemp -d --suffix=button_zonation)
cleanup() { rm -rf "$tmp"; }
trap cleanup EXIT

# Via https://www.syke.fi/fi-FI/Avoin_tieto/Paikkatietoaineistot/Ladattavat_paikkatietoaineistot(36026)
wget -O "$tmp/zonation.zip" http://wwwd3.ymparisto.fi/d3/gis_data/spesific/zonation_valtakunnallinen.zip

[[ $CLEAN = 1 ]] && rm -rf scratch
unzip -O cp437 -d scratch/ "$tmp/zonation.zip"


cd scratch/
../export_zonation.sh
cd ..

mkdir -p tiles/
mv scratch/*.mbtiles tiles/

# Output will be written to tiles/*.mbtiles
expected_output='
MetZa2018_VMA01.mbtiles
MetZa2018_VMA02.mbtiles
MetZa2018_VMA03.mbtiles
MetZa2018_VMA04.mbtiles
MetZa2018_VMA05.mbtiles
MetZa2018_VMA06.mbtiles
'

missing=0
for x in $expected_output; do
    [[ -s tiles/$x ]] || { echo "ERROR: Missing expected output: tiles/$x"; missing=1; }
done

[[ $missing = 0 ]] && [[ "$CLEAN" = 1 ]] && rm -rf scratch/

[[ $missing = 1 ]] && exit 1

echo "Done: output written to tiles/"
