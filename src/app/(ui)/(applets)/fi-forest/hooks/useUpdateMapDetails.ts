import { layerOptions } from '../constants'
import {
  fiForestsSumMethodAttrs,
  fiForestsBestMethodVsOther,
  fiForestsAreaCO2FillColor,
  fiForestsTextfieldExpression,
} from '../utils'
import { ForestryMethod, LayerLevel } from '../types'
import { useMapStore } from '#/common/store'

export const useUpdateMapDetails = () => {
  const setLayoutProperty = useMapStore((state) => state.setLayoutProperty)
  const setPaintProperty = useMapStore((state) => state.setPaintProperty)

  const updateMapDetails = (forestryMethod: ForestryMethod, carbonBalanceDifferenceFlag: boolean) => {
    const co2eValueExpr = fiForestsSumMethodAttrs(forestryMethod, 'cbt')

    const fiForestsRelativeCO2eValueExpr = fiForestsBestMethodVsOther(forestryMethod, 'cbt')

    const fillColor = carbonBalanceDifferenceFlag
      ? fiForestsAreaCO2FillColor(fiForestsRelativeCO2eValueExpr)
      : fiForestsAreaCO2FillColor(co2eValueExpr)

    for (const type of Object.keys(layerOptions)) {
      setPaintProperty(`${type}-fill`, 'fill-color', fillColor)
    }
    setLayoutProperty(LayerLevel.Parcel + '-symbol', 'text-field', fiForestsTextfieldExpression(co2eValueExpr))
  }

  return updateMapDetails
}
