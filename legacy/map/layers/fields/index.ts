import './fi_field_plots';
import './no_nibio_field_plots';
import { registerGroup } from 'src/map/layer_groups';

registerGroup('fields', [
  'mavi-plohko-removed-fill', 'mavi-plohko-removed-outline',
  'nibio-soils-fill', 'nibio-soils-outline', 'nibio-soils-sym',
])
