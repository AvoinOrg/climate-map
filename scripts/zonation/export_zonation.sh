#!/usr/bin/env bash
set -Eeuxo pipefail

dir=$(dirname "$0")

rm -f *.mbtiles
for f in *.tif; do
    python "$dir"/export_zonation.py $f
    name=$(basename $f .tif)

    i=$name.enc8.png
    gdal_translate -of PNG -expand rgba $name.enc8.png $name.enc8.expanded.png
    gdal_translate -of MBTiles $name.enc8.expanded.png $name.mbtiles
    gdaladdo -r nearest $name.mbtiles 2 4 8 16

    continue
    # Not needed anymore:
    mb-util --silent --image_format=png $name.mbtiles $name-tmp
    rm -rf "$name-old"
    [[ -d $name ]] && mv "$name" "$name-old"
    mv "$name-tmp" "$name"
done

