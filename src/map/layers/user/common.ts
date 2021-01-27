const userDatasets = {};
const userDatasetsRemove = {};

export const addDataset = (name: string, addFn: (secret: string) => void) => {
  userDatasets[name] = addFn;
};

export const removeDataset = (name: string, removeFn: () => void) => {
  userDatasetsRemove[name] = removeFn;
};

export const enableUserDataset = (name, token) => {
  const addLayerFn = userDatasets[name];
  addLayerFn(token);
};

export const disableUserDataset = (name) => {
  const removeLayerFn = userDatasetsRemove[name];
  removeLayerFn();
};
