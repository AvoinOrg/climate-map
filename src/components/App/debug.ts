import { map } from '../../map/map'
import * as LayerGroupState from '../../map/LayerGroupState';

// These help in development and debugging:
if (process.env.NODE_ENV !== 'production') {
  // @ts-ignore
  window.map = map;
  // @ts-ignore
  window.LayerGroupState = LayerGroupState;
}
