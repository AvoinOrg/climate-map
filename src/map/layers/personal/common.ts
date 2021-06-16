const personalDatasets = {};
const personalDatasetsRemove = {};

export const addDataset = (name: string, addFn: (secret: string) => void) => {
  personalDatasets[name] = addFn;
};

export const removeDataset = (name: string, removeFn: () => void) => {
  personalDatasetsRemove[name] = removeFn;
};

export const enablePersonalDataset = (name, token) => {
  const addLayerFn = personalDatasets[name];
  addLayerFn(token);
};

export const disablePersonalDataset = (name) => {
  const removeLayerFn = personalDatasetsRemove[name];
  removeLayerFn();
};
