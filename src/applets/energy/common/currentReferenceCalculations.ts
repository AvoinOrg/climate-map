import type { EnergymapEnergyScenarioPrefix } from './buildingInfo'
import {
  CURRENT_REFERENCE_BUILDING_CLASSES,
  CURRENT_REFERENCE_DATA,
  CURRENT_REFERENCE_ENERGY_CARRIERS,
} from './currentReferenceData'
import type {
  CurrentReferenceBuildingClass,
  CurrentReferenceEnergyCarrier,
  CurrentReferenceValue,
} from './currentReferenceData'

export type CurrentReferenceComponent = 'electricity' | 'heating'

export type CurrentReferenceUnsupportedReason =
  | 'missing-input'
  | 'unsupported-building-class'
  | 'unsupported-carrier'
  | 'unsupported-reference-value'
  | 'invalid-input'
  | 'non-finite-input'
  | 'non-finite-result'
  | 'non-representable-result'
  | 'incomplete-component'

export type CurrentReferenceField =
  | 'mainPurpose'
  | 'scenarioPrefix'
  | 'heatingCarrier'
  | 'floorAreaSquareMeters'
  | 'defaultElectricityIntensityKwhPerSquareMeterYear'
  | 'defaultHeatingIntensityKwhPerSquareMeterYear'
  | 'electricityEnergyKwhPerYear'
  | 'heatingEnergyKwhPerYear'
  | 'factorPerMwh'
  | 'electricityAmount'
  | 'heatingAmount'
  | 'residentCount'
  | 'total'

export type CurrentReferenceUnsupportedResult = {
  status: 'unsupported'
  reason: CurrentReferenceUnsupportedReason
  field?: CurrentReferenceField
  component?: CurrentReferenceComponent
  referenceReason?: 'not-supplied'
  cause?: CurrentReferenceUnsupportedReason
  causes?: readonly CurrentReferenceUnsupportedResult[]
  context?: {
    factorVersion: string
    buildingClass?: CurrentReferenceBuildingClass
    heatingCarrier?: CurrentReferenceEnergyCarrier
  }
}

export type CurrentReferenceResolution<T> =
  | {
      status: 'supported'
      value: T
    }
  | CurrentReferenceUnsupportedResult

export type CurrentReferenceCompleteResult<T extends object> = {
  status: 'complete'
} & T

export type CurrentReferenceCalculationResult<T extends object> =
  | CurrentReferenceCompleteResult<T>
  | CurrentReferenceUnsupportedResult

export type CurrentReferenceAnnualEnergyComponent = {
  carrier: CurrentReferenceEnergyCarrier
  energyKwhPerYear: number
}

export type CurrentReferenceAnnualEnergyComponents = {
  electricity: CurrentReferenceAnnualEnergyComponent
  heating: CurrentReferenceAnnualEnergyComponent
}

export type CurrentReferenceEnergyInput = {
  scenarioPrefix?: unknown
  floorAreaSquareMeters?: unknown
  defaultElectricityIntensityKwhPerSquareMeterYear?: unknown
  defaultHeatingIntensityKwhPerSquareMeterYear?: unknown
}

export type CurrentReferenceCostInput = CurrentReferenceEnergyInput & {
  mainPurpose?: unknown
}

export type CurrentReferenceAppliedFactorResult =
  CurrentReferenceCalculationResult<{
    amount: number
  }>

export type CurrentReferenceCompleteTotal = {
  electricity: number
  heating: number
  total: number
}

export type CurrentReferenceAnnualCostResult =
  CurrentReferenceCalculationResult<
    CurrentReferenceCompleteTotal & {
      unit: 'EUR/year'
    }
  >

export type CurrentReferenceAnnualCo2Result = CurrentReferenceCalculationResult<
  CurrentReferenceCompleteTotal & {
    unit: 'kg CO2/year'
  }
>

export type CurrentReferenceResidentCountResult =
  CurrentReferenceCalculationResult<{
    residentCount: number
  }>

export type CurrentReferenceAnnualWaterResult =
  CurrentReferenceCalculationResult<{
    cubicMetersPerYear: number
    unit: 'm³/year'
  }>

const SCENARIO_PREFIX_TO_CARRIER = {
  awhp: 'electricity',
  delec: 'electricity',
  distr: 'districtHeat',
  elecb: 'electricity',
  gshp: 'electricity',
  oil: 'lightFuelOil',
  wood: 'pellet',
} as const satisfies Record<
  EnergymapEnergyScenarioPrefix,
  CurrentReferenceEnergyCarrier
>

const isCurrentReferenceBuildingClass = (
  value: unknown
): value is CurrentReferenceBuildingClass =>
  typeof value === 'string' &&
  (CURRENT_REFERENCE_BUILDING_CLASSES as readonly string[]).includes(value)

const isCurrentReferenceEnergyCarrier = (
  value: unknown
): value is CurrentReferenceEnergyCarrier =>
  typeof value === 'string' &&
  (CURRENT_REFERENCE_ENERGY_CARRIERS as readonly string[]).includes(value)

const unsupported = (
  result: Omit<CurrentReferenceUnsupportedResult, 'status'>
): CurrentReferenceUnsupportedResult => ({
  status: 'unsupported',
  ...result,
})

const validateNonNegativeFiniteNumber = ({
  value,
  field,
  component,
}: {
  value: unknown
  field: CurrentReferenceField
  component?: CurrentReferenceComponent
}): CurrentReferenceResolution<number> => {
  if (value == null) {
    return unsupported({
      reason: 'missing-input',
      field,
      ...(component == null ? {} : { component }),
    })
  }

  if (typeof value !== 'number') {
    return unsupported({
      reason: 'invalid-input',
      field,
      ...(component == null ? {} : { component }),
    })
  }

  if (!Number.isFinite(value)) {
    return unsupported({
      reason: 'non-finite-input',
      field,
      ...(component == null ? {} : { component }),
    })
  }

  if (value < 0) {
    return unsupported({
      reason: 'invalid-input',
      field,
      ...(component == null ? {} : { component }),
    })
  }

  return {
    status: 'supported',
    value,
  }
}

const validatePositiveFiniteNumber = ({
  value,
  field,
}: {
  value: unknown
  field: CurrentReferenceField
}): CurrentReferenceResolution<number> => {
  const result = validateNonNegativeFiniteNumber({ value, field })

  if (result.status === 'unsupported') {
    return result
  }

  return result.value === 0
    ? unsupported({ reason: 'invalid-input', field })
    : result
}

export const deriveCurrentReferenceResidentCount = (
  floorAreaSquareMeters: unknown
): CurrentReferenceResidentCountResult => {
  const floorArea = validatePositiveFiniteNumber({
    value: floorAreaSquareMeters,
    field: 'floorAreaSquareMeters',
  })
  if (floorArea.status === 'unsupported') {
    return floorArea
  }

  const { occupancy } = CURRENT_REFERENCE_DATA.water
  const roundedResidentCount = Math.floor(
    floorArea.value / occupancy.squareMetresPerResident + 0.5
  )
  const residentCount = Math.min(
    occupancy.maximumResidents,
    Math.max(occupancy.minimumResidents, roundedResidentCount)
  )

  return {
    status: 'complete',
    residentCount,
  }
}

export const calculateCurrentReferenceAnnualWater = (
  residentCount: unknown
): CurrentReferenceAnnualWaterResult => {
  if (residentCount == null) {
    return unsupported({ reason: 'missing-input', field: 'residentCount' })
  }

  if (typeof residentCount !== 'number' || !Number.isInteger(residentCount)) {
    return unsupported({ reason: 'invalid-input', field: 'residentCount' })
  }

  if (!Number.isFinite(residentCount)) {
    return unsupported({ reason: 'non-finite-input', field: 'residentCount' })
  }

  const { occupancy, cubicMetersPerResidentPerYear } =
    CURRENT_REFERENCE_DATA.water
  if (
    residentCount < occupancy.minimumResidents ||
    residentCount > occupancy.maximumResidents
  ) {
    return unsupported({ reason: 'invalid-input', field: 'residentCount' })
  }

  const cubicMetersPerYear = Number(
    (residentCount * cubicMetersPerResidentPerYear.value).toFixed(1)
  )
  if (!Number.isFinite(cubicMetersPerYear)) {
    return unsupported({ reason: 'non-finite-result', field: 'residentCount' })
  }

  return {
    status: 'complete',
    cubicMetersPerYear,
    unit: 'm³/year',
  }
}

export const resolveCurrentReferenceBuildingClass = (
  mainPurpose: unknown
): CurrentReferenceResolution<CurrentReferenceBuildingClass> => {
  if (mainPurpose == null) {
    return unsupported({
      reason: 'missing-input',
      field: 'mainPurpose',
    })
  }

  const normalizedMainPurpose =
    typeof mainPurpose === 'number' && Number.isInteger(mainPurpose)
      ? String(mainPurpose).padStart(2, '0')
      : typeof mainPurpose === 'string'
        ? mainPurpose.trim()
        : null
  const buildingClass =
    normalizedMainPurpose === '05'
      ? 'detachedHouse'
      : normalizedMainPurpose === '06'
        ? 'apartmentBuilding'
        : null

  if (!isCurrentReferenceBuildingClass(buildingClass)) {
    return unsupported({
      reason: 'unsupported-building-class',
      field: 'mainPurpose',
    })
  }

  return {
    status: 'supported',
    value: buildingClass,
  }
}

export const resolveCurrentReferenceCarrier = (
  scenarioPrefix: unknown
): CurrentReferenceResolution<CurrentReferenceEnergyCarrier> => {
  if (scenarioPrefix == null) {
    return unsupported({
      reason: 'missing-input',
      field: 'scenarioPrefix',
    })
  }

  if (
    typeof scenarioPrefix !== 'string' ||
    !Object.hasOwn(SCENARIO_PREFIX_TO_CARRIER, scenarioPrefix)
  ) {
    return unsupported({
      reason: 'unsupported-carrier',
      field: 'scenarioPrefix',
    })
  }

  return {
    status: 'supported',
    value:
      SCENARIO_PREFIX_TO_CARRIER[
        scenarioPrefix as EnergymapEnergyScenarioPrefix
      ],
  }
}

export const deriveAnnualPurchasedEnergyComponents = ({
  heatingCarrier,
  floorAreaSquareMeters,
  defaultElectricityIntensityKwhPerSquareMeterYear,
  defaultHeatingIntensityKwhPerSquareMeterYear,
}: {
  heatingCarrier: unknown
  floorAreaSquareMeters: unknown
  defaultElectricityIntensityKwhPerSquareMeterYear: unknown
  defaultHeatingIntensityKwhPerSquareMeterYear: unknown
}): CurrentReferenceCalculationResult<CurrentReferenceAnnualEnergyComponents> => {
  if (heatingCarrier == null) {
    return unsupported({
      reason: 'missing-input',
      field: 'heatingCarrier',
      component: 'heating',
    })
  }

  if (!isCurrentReferenceEnergyCarrier(heatingCarrier)) {
    return unsupported({
      reason: 'unsupported-carrier',
      field: 'heatingCarrier',
      component: 'heating',
    })
  }

  const floorArea = validatePositiveFiniteNumber({
    value: floorAreaSquareMeters,
    field: 'floorAreaSquareMeters',
  })

  const electricityIntensity = validateNonNegativeFiniteNumber({
    value: defaultElectricityIntensityKwhPerSquareMeterYear,
    field: 'defaultElectricityIntensityKwhPerSquareMeterYear',
    component: 'electricity',
  })

  const heatingIntensity = validateNonNegativeFiniteNumber({
    value: defaultHeatingIntensityKwhPerSquareMeterYear,
    field: 'defaultHeatingIntensityKwhPerSquareMeterYear',
    component: 'heating',
  })
  const failures = [floorArea, electricityIntensity, heatingIntensity].filter(
    (result): result is CurrentReferenceUnsupportedResult =>
      result.status === 'unsupported'
  )
  if (
    floorArea.status === 'unsupported' ||
    electricityIntensity.status === 'unsupported' ||
    heatingIntensity.status === 'unsupported'
  ) {
    return {
      ...failures[0],
      ...(failures.length > 1 ? { causes: failures } : {}),
    }
  }

  const electricityEnergyKwhPerYear =
    floorArea.value * electricityIntensity.value
  if (!Number.isFinite(electricityEnergyKwhPerYear)) {
    return unsupported({
      reason: 'non-finite-result',
      field: 'electricityEnergyKwhPerYear',
      component: 'electricity',
    })
  }
  if (
    electricityEnergyKwhPerYear === 0 &&
    floorArea.value > 0 &&
    electricityIntensity.value > 0
  ) {
    return unsupported({
      reason: 'non-representable-result',
      field: 'electricityEnergyKwhPerYear',
      component: 'electricity',
    })
  }

  const heatingEnergyKwhPerYear = floorArea.value * heatingIntensity.value
  if (!Number.isFinite(heatingEnergyKwhPerYear)) {
    return unsupported({
      reason: 'non-finite-result',
      field: 'heatingEnergyKwhPerYear',
      component: 'heating',
    })
  }
  if (
    heatingEnergyKwhPerYear === 0 &&
    floorArea.value > 0 &&
    heatingIntensity.value > 0
  ) {
    return unsupported({
      reason: 'non-representable-result',
      field: 'heatingEnergyKwhPerYear',
      component: 'heating',
    })
  }

  return {
    status: 'complete',
    electricity: {
      carrier: 'electricity',
      energyKwhPerYear: electricityEnergyKwhPerYear,
    },
    heating: {
      carrier: heatingCarrier,
      energyKwhPerYear: heatingEnergyKwhPerYear,
    },
  }
}

const resolveFactor = ({
  factorPerMwh,
  component,
}: {
  factorPerMwh: unknown
  component: CurrentReferenceComponent
}): CurrentReferenceResolution<number> => {
  if (factorPerMwh == null) {
    return unsupported({
      reason: 'missing-input',
      field: 'factorPerMwh',
      component,
    })
  }

  if (typeof factorPerMwh !== 'object' || !('status' in factorPerMwh)) {
    return unsupported({
      reason: 'invalid-input',
      field: 'factorPerMwh',
      component,
    })
  }

  const factor = factorPerMwh as Partial<CurrentReferenceValue>
  if (factor.status === 'unsupported') {
    return unsupported({
      reason: 'unsupported-reference-value',
      field: 'factorPerMwh',
      component,
      referenceReason: factor.reason,
    })
  }

  if (factor.status !== 'supported') {
    return unsupported({
      reason: 'invalid-input',
      field: 'factorPerMwh',
      component,
    })
  }

  return validateNonNegativeFiniteNumber({
    value: factor.value,
    field: 'factorPerMwh',
    component,
  })
}

export const applyCurrentReferenceFactor = ({
  energyKwhPerYear,
  factorPerMwh,
  component,
}: {
  energyKwhPerYear: unknown
  factorPerMwh: unknown
  component: CurrentReferenceComponent
}): CurrentReferenceAppliedFactorResult => {
  const energy = validateNonNegativeFiniteNumber({
    value: energyKwhPerYear,
    field:
      component === 'electricity'
        ? 'electricityEnergyKwhPerYear'
        : 'heatingEnergyKwhPerYear',
    component,
  })
  if (energy.status === 'unsupported') {
    return energy
  }

  if (energy.value === 0) {
    return {
      status: 'complete',
      amount: 0,
    }
  }

  const factor = resolveFactor({ factorPerMwh, component })
  if (factor.status === 'unsupported') {
    return factor
  }

  const amount = (energy.value / 1000) * factor.value
  if (!Number.isFinite(amount)) {
    return unsupported({
      reason: 'non-finite-result',
      field:
        component === 'electricity' ? 'electricityAmount' : 'heatingAmount',
      component,
    })
  }
  if (amount === 0 && energy.value > 0 && factor.value > 0) {
    return unsupported({
      reason: 'non-representable-result',
      field:
        component === 'electricity' ? 'electricityAmount' : 'heatingAmount',
      component,
    })
  }

  return {
    status: 'complete',
    amount,
  }
}

export const aggregateCompleteCurrentReferenceTotal = ({
  electricity,
  heating,
}: {
  electricity: CurrentReferenceAppliedFactorResult
  heating: CurrentReferenceAppliedFactorResult
}): CurrentReferenceCalculationResult<CurrentReferenceCompleteTotal> => {
  if (
    electricity.status === 'unsupported' ||
    heating.status === 'unsupported'
  ) {
    const failures = [electricity, heating].filter(
      (result): result is CurrentReferenceUnsupportedResult =>
        result.status === 'unsupported'
    )
    return {
      ...failures[0],
      reason: 'incomplete-component',
      cause: failures[0].reason,
      causes: failures,
    }
  }

  const electricityAmount = validateNonNegativeFiniteNumber({
    value: electricity.amount,
    field: 'electricityAmount',
    component: 'electricity',
  })
  if (electricityAmount.status === 'unsupported') {
    return electricityAmount
  }

  const heatingAmount = validateNonNegativeFiniteNumber({
    value: heating.amount,
    field: 'heatingAmount',
    component: 'heating',
  })
  if (heatingAmount.status === 'unsupported') {
    return heatingAmount
  }

  const total = electricityAmount.value + heatingAmount.value
  if (!Number.isFinite(total)) {
    return unsupported({
      reason: 'non-finite-result',
      field: 'total',
    })
  }

  return {
    status: 'complete',
    electricity: electricityAmount.value,
    heating: heatingAmount.value,
    total,
  }
}

const resolveAnnualEnergyComponents = (
  input: CurrentReferenceEnergyInput
): CurrentReferenceCalculationResult<CurrentReferenceAnnualEnergyComponents> => {
  const carrier = resolveCurrentReferenceCarrier(input.scenarioPrefix)
  if (carrier.status === 'unsupported') {
    return carrier
  }

  return deriveAnnualPurchasedEnergyComponents({
    heatingCarrier: carrier.value,
    floorAreaSquareMeters: input.floorAreaSquareMeters,
    defaultElectricityIntensityKwhPerSquareMeterYear:
      input.defaultElectricityIntensityKwhPerSquareMeterYear,
    defaultHeatingIntensityKwhPerSquareMeterYear:
      input.defaultHeatingIntensityKwhPerSquareMeterYear,
  })
}

export const calculateCurrentReferenceAnnualCost = (
  input: CurrentReferenceCostInput
): CurrentReferenceAnnualCostResult => {
  const buildingClass = resolveCurrentReferenceBuildingClass(input.mainPurpose)
  if (buildingClass.status === 'unsupported') {
    return buildingClass
  }

  const energy = resolveAnnualEnergyComponents(input)
  if (energy.status === 'unsupported') {
    return energy
  }

  const prices =
    CURRENT_REFERENCE_DATA.annualEnergyCostPrices.byBuildingClass[
      buildingClass.value
    ]
  const total = aggregateCompleteCurrentReferenceTotal({
    electricity: applyCurrentReferenceFactor({
      component: 'electricity',
      energyKwhPerYear: energy.electricity.energyKwhPerYear,
      factorPerMwh: prices.electricity,
    }),
    heating: applyCurrentReferenceFactor({
      component: 'heating',
      energyKwhPerYear: energy.heating.energyKwhPerYear,
      factorPerMwh: prices[energy.heating.carrier],
    }),
  })

  if (total.status === 'unsupported') {
    return {
      ...total,
      context: {
        factorVersion: CURRENT_REFERENCE_DATA.version,
        buildingClass: buildingClass.value,
        heatingCarrier: energy.heating.carrier,
      },
    }
  }

  return {
    ...total,
    unit: 'EUR/year',
  }
}

export const calculateCurrentReferenceAnnualCo2 = (
  input: CurrentReferenceEnergyInput
): CurrentReferenceAnnualCo2Result => {
  const energy = resolveAnnualEnergyComponents(input)
  if (energy.status === 'unsupported') {
    return energy
  }

  const factors = CURRENT_REFERENCE_DATA.emissionFactors.byCarrier
  const total = aggregateCompleteCurrentReferenceTotal({
    electricity: applyCurrentReferenceFactor({
      component: 'electricity',
      energyKwhPerYear: energy.electricity.energyKwhPerYear,
      factorPerMwh: factors.electricity,
    }),
    heating: applyCurrentReferenceFactor({
      component: 'heating',
      energyKwhPerYear: energy.heating.energyKwhPerYear,
      factorPerMwh: factors[energy.heating.carrier],
    }),
  })

  if (total.status === 'unsupported') {
    return {
      ...total,
      context: {
        factorVersion: CURRENT_REFERENCE_DATA.version,
        heatingCarrier: energy.heating.carrier,
      },
    }
  }

  return {
    ...total,
    unit: 'kg CO2/year',
  }
}
