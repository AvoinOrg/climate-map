import { layerGroups } from './layer_groups'
import { originalLayerDefs, originalSourceDefs } from './utils';

// TODO: export pre-multiplied alpha colors:
// https://github.com/mapbox/mapbox-gl-native/issues/193#issuecomment-43077841
// > A color component can be from 0 to N where N is the alpha component of the color.
// > So a color like rgba(1, 1, 1, 0.5) turns into a premultiplied color of rgba(0.5, 0.5, 0.5, 0.5),
// > i.e. N is 0.5 here because alpha is 0.5.

// @ts-ignore
window.exportLayerGroup = groupName => {
    const e = { "version": 8, "name": "export", sources: {}, layers: [] }
    e.layers = layerGroups[groupName]
        .filter(x => typeof x === 'string')
        .map(x => originalLayerDefs[x as any])
        .filter(x => x.type !== 'symbol')
        .filter(x => x.type !== 'raster')
        ;
    e.layers.forEach(({ source }) => {
        e.sources[source] = originalSourceDefs[source];
    });

    console.log(JSON.stringify(e));
}
