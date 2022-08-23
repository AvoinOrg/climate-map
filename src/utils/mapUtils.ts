import { Select } from 'ol/interaction'
import { click } from 'ol/events/condition'

export const fillOpacity = 0.65

export const createPopup = (layers: any, selectedStyle: any, map: any, popup?: any) => {
  // let select: any = null // ref to currently selected interaction

  // const selectStyle = (feature: any, selectedStyle: any) => {
  //   const color = feature.get('COLOR') || '#eeeeee'
  //   selectedStyle.getFill().setColor(color)
  //   return selectedStyle
  // }

  // // select interaction working on "click"
  // const selectClick = new Select({
  //   // condition: click,
  //   style: selectStyle,
  //   layers: layers,
  // })

  // select = selectClick

  // // map.removeInteraction(select)

  // if (select !== null) {
  //   map.addInteraction(select)
  //   select.on('select', function (e: any) {
  //     console.log("sdafasdfasdf")
  //     document.getElementById('status').innerHTML =
  //       '&nbsp;' +
  //       e.target.getFeatures().getLength() +
  //       ' selected features (last operation selected ' +
  //       e.selected.length +
  //       ' and deselected ' +
  //       e.deselected.length +
  //       ' features)'
  //   })
  // }

  // map.on('singleclick', function (evt: any) {
  //   const features = map.getFeaturesAtPixel(evt.pixel)
  //   console.log(features)
  //   map.forEachLayerAtPixel(evt.pixel, function (layer: any) {})
  // })
}
