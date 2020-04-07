import { registerGroup, hideAllLayersMatchingFilter } from 'src/map/layer_groups';

import './ethiopia';
import './fi_arvometsa';
import './fi_forest_grid';
import './fi_forests';
import './fi_mature_forests';
import './global_forest_watch_plantations';
import './global_mangrove_watch';
import './madagascar';
import './no_nibio_forests';

registerGroup('forests', [
  () => hideAllLayersMatchingFilter(x => /mature-forests/.test(x)),

  // Norway
  'nibio-ar50-forests-fill', 'nibio-ar50-forests-outline', 'nibio-ar50-forests-sym',
])
