import { hideAllLayersMatchingFilter, toggleGroup } from '../../layer_groups'

const privateDatasets = {}

export const addDataset = (name: string, addFn: (secret: string) => void) => {
    privateDatasets[name] = addFn;
}

export const enablePrivateDatasets = (secrets = []) => {
    for (const secret of secrets) {
        const name = secret.split('-')[0];
        const addLayerFn = privateDatasets[name];
        console.log('Enabled private dataset:', name)
        addLayerFn(secret);
        document.querySelector(`#layer-card-${name}`).removeAttribute('hidden');

        if (name === 'valio') {
            // Enable the Valio fields and the Biodiversity layers by default only.
            hideAllLayersMatchingFilter(x => /./.test(x));
            toggleGroup('valio');
            toggleGroup('zonation6');
        }
    }
}
