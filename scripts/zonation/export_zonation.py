import sys
import rasterio
import numpy as np

# import matplotlib.pyplot as plt
# cmap = plt.get_cmap('viridis')
# cmap4 = {i:([round(z*255) for z in x]+[255]) if i else [0,0,0,0] for i,x in enumerate(cmap.colors)}

# a fully transparent colormap except for the two entries:
cmap4 = dict(enumerate([[0,0,0,0]]*256))

light_green = 191 # '#46ce4d', 'rgb(70, 206, 77)'
dark_green = 255 # '#17631b', 'rgb(23, 99, 27)'

cmap4[light_green] = 70, 206, 77, 255
cmap4[dark_green] = 23, 99, 27, 255

#NB: Zonation input files directly correspond to quantiles!
# np.quantile(r[mask], 0.5) ~= 0.5, etc.

f = sys.argv[1]
with rasterio.open(f) as src:
    r = src.read(1)
    mask = src.read_masks(1) == 255

    # Old log-based encoding:
    # smallest = np.min(r[mask])
    # assert smallest > 1e-9, smallest
    # # Avoid warnings from log underflow.
    # r[~mask] = 1e-9
    # encoded = 255 - (255 * np.log(r) / np.log(1e-9)).round().astype(np.uint8)

    encoded = np.where(r < 0.9, 0,
        np.where(r < 0.95, light_green, dark_green)
    ).astype(np.uint8)

    dst_profile = src.profile.copy()
    dst_profile.update({
        'driver': 'PNG',
        'dtype': 'uint8',
        'nodata': 0,
    })

    with rasterio.open(f.replace('.tif', '.enc8.png'), 'w', **dst_profile) as dst:
        dst.write(encoded, indexes=1)
        dst.write_colormap(1, cmap4)

