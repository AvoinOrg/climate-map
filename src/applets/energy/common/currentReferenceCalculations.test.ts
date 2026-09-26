import {
  aggregateCompleteCurrentReferenceTotal,
  applyCurrentReferenceFactor,
  calculateCurrentReferenceAnnualCo2,
  calculateCurrentReferenceAnnualCost,
  calculateCurrentReferenceAnnualWater,
  deriveCurrentReferenceResidentCount,
  deriveAnnualPurchasedEnergyComponents,
  resolveCurrentReferenceBuildingClass,
  resolveCurrentReferenceCarrier,
} from './currentReferenceCalculations'
import { CURRENT_REFERENCE_DATA } from './currentReferenceData'

const completeEnergyInput = {
  scenarioPrefix: 'distr',
  floorAreaSquareMeters: 100,
  defaultElectricityIntensityKwhPerSquareMeterYear: 10,
  defaultHeatingIntensityKwhPerSquareMeterYear: 20,
} as const

describe('current-reference data', () => {
  it('keeps the approved values and audit metadata in one versioned object', () => {
    expect(CURRENT_REFERENCE_DATA).toMatchObject({
      provenance:
        'Product-supplied factor set from approved F075 feature intake; resident occupancy heuristic approved by the product owner on 2026-08-02.',
      version: 'F075-resident-water-2026-08-02',
      lastReviewed: '2026-08-02',
      annualEnergyCostPrices: {
        unit: 'EUR/MWh',
        byBuildingClass: {
          apartmentBuilding: {
            electricity: { status: 'supported', value: 263.27 },
            districtHeat: { status: 'supported', value: 103.03 },
            lightFuelOil: { status: 'supported', value: 131.01 },
            pellet: { status: 'unsupported', reason: 'not-supplied' },
          },
          detachedHouse: {
            electricity: { status: 'supported', value: 161.23 },
            districtHeat: { status: 'supported', value: 114.39 },
            lightFuelOil: { status: 'supported', value: 131.01 },
            pellet: { status: 'supported', value: 89.56 },
          },
        },
      },
      emissionFactors: {
        unit: 'kg CO2/MWh',
        byCarrier: {
          electricity: { status: 'supported', value: 45 },
          districtHeat: { status: 'supported', value: 115 },
          lightFuelOil: { status: 'supported', value: 242.3 },
          pellet: { status: 'supported', value: 0 },
        },
      },
      water: {
        occupancy: {
          squareMetresPerResident: 41.6,
          minimumResidents: 1,
          maximumResidents: 10000,
          rounding: 'half-up',
          approvedAt: '2026-08-02',
          sourceUrl:
            'https://otos.stat.fi/server/api/core/bitstreams/f3e835da-b220-4251-8079-7b7309d1d2a4/content',
        },
        litersPerResidentPerDay: {
          value: 120,
          unit: 'L/resident/day',
        },
        cubicMetersPerResidentPerYear: {
          value: 43.8,
          unit: 'm³/resident/year',
        },
      },
    })
  })

  it('documents the supplied pellet factor within its fossil-accounting boundary', () => {
    expect(CURRENT_REFERENCE_DATA.emissionFactors.byCarrier.pellet).toEqual({
      status: 'supported',
      value: 0,
    })
    expect(CURRENT_REFERENCE_DATA.emissionFactors.accountingBoundary).toContain(
      'Fossil-accounting boundary only'
    )
    expect(CURRENT_REFERENCE_DATA.emissionFactors.accountingBoundary).toContain(
      'not a lifecycle or biogenic-emissions claim'
    )
  })
})

describe('current-reference Water calculations', () => {
  it.each([
    [0.01, 1],
    [41.6, 1],
    [62.4, 2],
    [124.8, 3],
    [41.6 * 10001, 10000],
  ])('derives %p m² as %p residents with half-up rounding and clamps', (area, expected) => {
    expect(deriveCurrentReferenceResidentCount(area)).toEqual({
      status: 'complete',
      residentCount: expected,
    })
  })

  it.each([null, undefined, 0, -1, NaN, Infinity, -Infinity, '41.6'])(
    'rejects invalid floor area %p',
    (area) => {
      expect(deriveCurrentReferenceResidentCount(area)).toMatchObject({
        status: 'unsupported',
        field: 'floorAreaSquareMeters',
      })
    }
  )

  it('calculates annual Water only for complete integer resident counts', () => {
    expect(calculateCurrentReferenceAnnualWater(11)).toEqual({
      status: 'complete',
      cubicMetersPerYear: 481.8,
      unit: 'm³/year',
    })

    for (const residentCount of [null, 0, 1.5, NaN, Infinity, 10001, '11']) {
      expect(calculateCurrentReferenceAnnualWater(residentCount)).toMatchObject({
        status: 'unsupported',
        field: 'residentCount',
      })
    }
  })
})

describe('current-reference classification', () => {
  it.each([
    ['05', 'detachedHouse'],
    [5, 'detachedHouse'],
    ['06', 'apartmentBuilding'],
    [6, 'apartmentBuilding'],
  ])('maps supported main purpose %p to %s', (mainPurpose, expected) => {
    expect(resolveCurrentReferenceBuildingClass(mainPurpose)).toEqual({
      status: 'supported',
      value: expected,
    })
  })

  it.each([null, undefined])(
    'rejects absent main purpose %p explicitly',
    (mainPurpose) => {
      expect(resolveCurrentReferenceBuildingClass(mainPurpose)).toEqual({
        status: 'unsupported',
        reason: 'missing-input',
        field: 'mainPurpose',
      })
    }
  )

  it.each(['5', '07', '', true, 5.5, {}, NaN, Infinity])(
    'rejects unsupported or malformed main purpose %p',
    (mainPurpose) => {
      expect(resolveCurrentReferenceBuildingClass(mainPurpose)).toEqual({
        status: 'unsupported',
        reason: 'unsupported-building-class',
        field: 'mainPurpose',
      })
    }
  )

  it.each([
    ['distr', 'districtHeat'],
    ['oil', 'lightFuelOil'],
    ['wood', 'pellet'],
    ['delec', 'electricity'],
    ['elecb', 'electricity'],
    ['gshp', 'electricity'],
    ['awhp', 'electricity'],
  ])('maps scenario prefix %s to %s', (prefix, expected) => {
    expect(resolveCurrentReferenceCarrier(prefix)).toEqual({
      status: 'supported',
      value: expected,
    })
  })

  it.each([null, undefined])(
    'rejects absent scenario prefix %p explicitly',
    (prefix) => {
      expect(resolveCurrentReferenceCarrier(prefix)).toEqual({
        status: 'unsupported',
        reason: 'missing-input',
        field: 'scenarioPrefix',
      })
    }
  )

  it.each(['unknown', 'toString', '', 4, {}, false])(
    'keeps unknown scenario prefix %p unsupported',
    (prefix) => {
      expect(resolveCurrentReferenceCarrier(prefix)).toEqual({
        status: 'unsupported',
        reason: 'unsupported-carrier',
        field: 'scenarioPrefix',
      })
    }
  )
})

describe('annual purchased-energy components', () => {
  it('uses floor area with the separate default electricity and heat intensities', () => {
    expect(
      deriveAnnualPurchasedEnergyComponents({
        heatingCarrier: 'districtHeat',
        floorAreaSquareMeters: 125,
        defaultElectricityIntensityKwhPerSquareMeterYear: 8,
        defaultHeatingIntensityKwhPerSquareMeterYear: 24,
      })
    ).toEqual({
      status: 'complete',
      electricity: {
        carrier: 'electricity',
        energyKwhPerYear: 1000,
      },
      heating: {
        carrier: 'districtHeat',
        energyKwhPerYear: 3000,
      },
    })
  })

  it('preserves explicit zero energy components as complete values', () => {
    expect(
      deriveAnnualPurchasedEnergyComponents({
        heatingCarrier: 'electricity',
        floorAreaSquareMeters: 100,
        defaultElectricityIntensityKwhPerSquareMeterYear: 0,
        defaultHeatingIntensityKwhPerSquareMeterYear: 0,
      })
    ).toEqual({
      status: 'complete',
      electricity: {
        carrier: 'electricity',
        energyKwhPerYear: 0,
      },
      heating: {
        carrier: 'electricity',
        energyKwhPerYear: 0,
      },
    })
  })

  it('rejects a missing component without exposing the valid component', () => {
    const result = deriveAnnualPurchasedEnergyComponents({
      heatingCarrier: 'districtHeat',
      floorAreaSquareMeters: 100,
      defaultElectricityIntensityKwhPerSquareMeterYear: 10,
      defaultHeatingIntensityKwhPerSquareMeterYear: undefined,
    })

    expect(result).toEqual({
      status: 'unsupported',
      reason: 'missing-input',
      field: 'defaultHeatingIntensityKwhPerSquareMeterYear',
      component: 'heating',
    })
    expect(result).not.toHaveProperty('electricity')
    expect(result).not.toHaveProperty('heating')
  })

  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite component input %p',
    (value) => {
      expect(
        deriveAnnualPurchasedEnergyComponents({
          heatingCarrier: 'districtHeat',
          floorAreaSquareMeters: 100,
          defaultElectricityIntensityKwhPerSquareMeterYear: value,
          defaultHeatingIntensityKwhPerSquareMeterYear: 20,
        })
      ).toEqual({
        status: 'unsupported',
        reason: 'non-finite-input',
        field: 'defaultElectricityIntensityKwhPerSquareMeterYear',
        component: 'electricity',
      })
    }
  )

  it('rejects negative input and finite operands whose product overflows', () => {
    expect(
      deriveAnnualPurchasedEnergyComponents({
        heatingCarrier: 'districtHeat',
        floorAreaSquareMeters: -1,
        defaultElectricityIntensityKwhPerSquareMeterYear: 10,
        defaultHeatingIntensityKwhPerSquareMeterYear: 20,
      })
    ).toEqual({
      status: 'unsupported',
      reason: 'invalid-input',
      field: 'floorAreaSquareMeters',
    })

    const overflow = deriveAnnualPurchasedEnergyComponents({
      heatingCarrier: 'districtHeat',
      floorAreaSquareMeters: Number.MAX_VALUE,
      defaultElectricityIntensityKwhPerSquareMeterYear: 2,
      defaultHeatingIntensityKwhPerSquareMeterYear: 1,
    })

    expect(overflow).toEqual({
      status: 'unsupported',
      reason: 'non-finite-result',
      field: 'electricityEnergyKwhPerYear',
      component: 'electricity',
    })
  })

  it('rejects positive inputs whose product would underflow to a fabricated zero', () => {
    expect(
      deriveAnnualPurchasedEnergyComponents({
        heatingCarrier: 'districtHeat',
        floorAreaSquareMeters: Number.MIN_VALUE,
        defaultElectricityIntensityKwhPerSquareMeterYear: 0.5,
        defaultHeatingIntensityKwhPerSquareMeterYear: 1,
      })
    ).toEqual({
      status: 'unsupported',
      reason: 'non-representable-result',
      field: 'electricityEnergyKwhPerYear',
      component: 'electricity',
    })
  })
})

describe('factor application and complete-only aggregation', () => {
  it('converts kWh to MWh before applying a per-MWh factor', () => {
    expect(
      applyCurrentReferenceFactor({
        component: 'electricity',
        energyKwhPerYear: 1500,
        factorPerMwh: { status: 'supported', value: 263.27 },
      })
    ).toEqual({
      status: 'complete',
      amount: 394.905,
    })
  })

  it('distinguishes valid zero factors from unsupported factors', () => {
    expect(
      applyCurrentReferenceFactor({
        component: 'heating',
        energyKwhPerYear: 2000,
        factorPerMwh: { status: 'supported', value: 0 },
      })
    ).toEqual({ status: 'complete', amount: 0 })

    const unsupported = applyCurrentReferenceFactor({
      component: 'heating',
      energyKwhPerYear: 2000,
      factorPerMwh: { status: 'unsupported', reason: 'not-supplied' },
    })

    expect(unsupported).toEqual({
      status: 'unsupported',
      reason: 'unsupported-reference-value',
      field: 'factorPerMwh',
      component: 'heating',
      referenceReason: 'not-supplied',
    })
    expect(unsupported).not.toHaveProperty('amount')
  })

  it('does not require a reference factor for an unused zero-energy component', () => {
    const unsupportedFactor = {
      status: 'unsupported',
      reason: 'not-supplied',
    } as const

    expect(
      applyCurrentReferenceFactor({
        component: 'heating',
        energyKwhPerYear: 0,
        factorPerMwh: unsupportedFactor,
      })
    ).toEqual({ status: 'complete', amount: 0 })

    expect(
      applyCurrentReferenceFactor({
        component: 'heating',
        energyKwhPerYear: 1,
        factorPerMwh: unsupportedFactor,
      })
    ).toEqual({
      status: 'unsupported',
      reason: 'unsupported-reference-value',
      field: 'factorPerMwh',
      component: 'heating',
      referenceReason: 'not-supplied',
    })
  })

  it('rejects factor application that would underflow to a fabricated zero', () => {
    expect(
      applyCurrentReferenceFactor({
        component: 'electricity',
        energyKwhPerYear: Number.MIN_VALUE,
        factorPerMwh: { status: 'supported', value: 1 },
      })
    ).toEqual({
      status: 'unsupported',
      reason: 'non-representable-result',
      field: 'electricityAmount',
      component: 'electricity',
    })
  })

  it.each([
    [undefined, 'missing-input'],
    [{ status: 'supported', value: NaN }, 'non-finite-input'],
    [{ status: 'supported', value: Infinity }, 'non-finite-input'],
    [{ status: 'supported', value: -1 }, 'invalid-input'],
  ])('rejects absent or invalid factor %p', (factorPerMwh, reason) => {
    expect(
      applyCurrentReferenceFactor({
        component: 'electricity',
        energyKwhPerYear: 1000,
        factorPerMwh,
      })
    ).toEqual({
      status: 'unsupported',
      reason,
      field: 'factorPerMwh',
      component: 'electricity',
    })
  })

  it('returns a total only when both components are complete', () => {
    expect(
      aggregateCompleteCurrentReferenceTotal({
        electricity: { status: 'complete', amount: 10 },
        heating: { status: 'complete', amount: 20 },
      })
    ).toEqual({
      status: 'complete',
      electricity: 10,
      heating: 20,
      total: 30,
    })

    const partial = aggregateCompleteCurrentReferenceTotal({
      electricity: { status: 'complete', amount: 10 },
      heating: {
        status: 'unsupported',
        reason: 'missing-input',
        field: 'factorPerMwh',
        component: 'heating',
      },
    })

    expect(partial).toEqual({
      status: 'unsupported',
      reason: 'incomplete-component',
      component: 'heating',
      cause: 'missing-input',
      field: 'factorPerMwh',
      causes: [{ status: 'unsupported', reason: 'missing-input', field: 'factorPerMwh', component: 'heating' }],
    })
    expect(partial).not.toHaveProperty('electricity')
    expect(partial).not.toHaveProperty('heating')
    expect(partial).not.toHaveProperty('total')
  })

  it('rejects a non-finite aggregate instead of returning Infinity', () => {
    expect(
      aggregateCompleteCurrentReferenceTotal({
        electricity: { status: 'complete', amount: Number.MAX_VALUE },
        heating: { status: 'complete', amount: Number.MAX_VALUE },
      })
    ).toEqual({
      status: 'unsupported',
      reason: 'non-finite-result',
      field: 'total',
    })
  })
})

describe('complete current-reference Cost and CO2 calculations', () => {
  it('calculates detached-house district-heat Cost with separate components', () => {
    const result = calculateCurrentReferenceAnnualCost({
      ...completeEnergyInput,
      mainPurpose: '05',
    })

    expect(result).toEqual({
      status: 'complete',
      unit: 'EUR/year',
      electricity: 161.23,
      heating: 228.78,
      total: 390.01,
    })
  })

  it('calculates CO2 without requiring a building class', () => {
    expect(calculateCurrentReferenceAnnualCo2(completeEnergyInput)).toEqual({
      status: 'complete',
      unit: 'kg CO2/year',
      electricity: 45,
      heating: 230,
      total: 275,
    })
  })

  it.each(['delec', 'elecb', 'gshp', 'awhp']) (
    'applies the electricity factor independently to %s heating',
    (scenarioPrefix) => {
      expect(
        calculateCurrentReferenceAnnualCo2({
          ...completeEnergyInput,
          scenarioPrefix,
        })
      ).toEqual({
        status: 'complete',
        unit: 'kg CO2/year',
        electricity: 45,
        heating: 90,
        total: 135,
      })
    }
  )

  it('keeps apartment-pellet Cost unsupported without blocking pellet CO2', () => {
    const apartmentPelletInput = {
      ...completeEnergyInput,
      scenarioPrefix: 'wood',
    }
    const cost = calculateCurrentReferenceAnnualCost({
      ...apartmentPelletInput,
      mainPurpose: '06',
    })

    expect(cost).toEqual({
      status: 'unsupported',
      reason: 'incomplete-component',
      component: 'heating',
      cause: 'unsupported-reference-value',
      field: 'factorPerMwh',
      referenceReason: 'not-supplied',
      causes: [{ status: 'unsupported', reason: 'unsupported-reference-value', field: 'factorPerMwh', component: 'heating', referenceReason: 'not-supplied' }],
      context: { factorVersion: CURRENT_REFERENCE_DATA.version, buildingClass: 'apartmentBuilding', heatingCarrier: 'pellet' },
    })
    expect(cost).not.toHaveProperty('total')
    expect(calculateCurrentReferenceAnnualCo2(apartmentPelletInput)).toEqual({
      status: 'complete',
      unit: 'kg CO2/year',
      electricity: 45,
      heating: 0,
      total: 45,
    })
  })

  it('keeps zero apartment-pellet heat complete without requiring its missing price', () => {
    expect(
      calculateCurrentReferenceAnnualCost({
        ...completeEnergyInput,
        mainPurpose: '06',
        scenarioPrefix: 'wood',
        defaultHeatingIntensityKwhPerSquareMeterYear: 0,
      })
    ).toEqual({
      status: 'complete',
      unit: 'EUR/year',
      electricity: 263.27,
      heating: 0,
      total: 263.27,
    })
  })

  it('keeps zero components complete and missing components unsupported', () => {
    expect(
      calculateCurrentReferenceAnnualCost({
        ...completeEnergyInput,
        mainPurpose: '05',
        defaultElectricityIntensityKwhPerSquareMeterYear: 0,
        defaultHeatingIntensityKwhPerSquareMeterYear: 0,
      })
    ).toEqual({
      status: 'complete',
      unit: 'EUR/year',
      electricity: 0,
      heating: 0,
      total: 0,
    })

    const missing = calculateCurrentReferenceAnnualCo2({
      ...completeEnergyInput,
      defaultHeatingIntensityKwhPerSquareMeterYear: null,
    })

    expect(missing).toEqual({
      status: 'unsupported',
      reason: 'missing-input',
      field: 'defaultHeatingIntensityKwhPerSquareMeterYear',
      component: 'heating',
    })
    expect(missing).not.toHaveProperty('total')
  })

  it.each([NaN, Infinity, -Infinity])(
    'rejects non-finite top-level input %p',
    (value) => {
      const result = calculateCurrentReferenceAnnualCo2({
        ...completeEnergyInput,
        floorAreaSquareMeters: value,
      })

      expect(result).toEqual({
        status: 'unsupported',
        reason: 'non-finite-input',
        field: 'floorAreaSquareMeters',
      })
      expect(result).not.toHaveProperty('total')
    }
  )

  it('rejects unknown carriers without a fabricated total', () => {
    const result = calculateCurrentReferenceAnnualCost({
      ...completeEnergyInput,
      mainPurpose: '05',
      scenarioPrefix: 'unknown',
    })

    expect(result).toEqual({
      status: 'unsupported',
      reason: 'unsupported-carrier',
      field: 'scenarioPrefix',
    })
    expect(result).not.toHaveProperty('total')
  })
})

it('rejects zero area while preserving real zero energy at positive area', () => {
  expect(
    calculateCurrentReferenceAnnualCo2({
      ...completeEnergyInput,
      floorAreaSquareMeters: 0,
    })
  ).toMatchObject({
    status: 'unsupported',
    reason: 'invalid-input',
    field: 'floorAreaSquareMeters',
  })
  expect(
    calculateCurrentReferenceAnnualCo2({
      ...completeEnergyInput,
      defaultElectricityIntensityKwhPerSquareMeterYear: 0,
      defaultHeatingIntensityKwhPerSquareMeterYear: 0,
    })
  ).toMatchObject({ status: 'complete', total: 0 })
})

it('retains independently failing annual operands and factor components', () => {
  expect(
    deriveAnnualPurchasedEnergyComponents({
      heatingCarrier: 'electricity',
      floorAreaSquareMeters: 0,
      defaultElectricityIntensityKwhPerSquareMeterYear: null,
      defaultHeatingIntensityKwhPerSquareMeterYear: -1,
    })
  ).toMatchObject({
    causes: [
      {
        status: 'unsupported',
        reason: 'invalid-input',
        field: 'floorAreaSquareMeters',
      },
      {
        status: 'unsupported',
        reason: 'missing-input',
        field: 'defaultElectricityIntensityKwhPerSquareMeterYear',
        component: 'electricity',
      },
      {
        status: 'unsupported',
        reason: 'invalid-input',
        field: 'defaultHeatingIntensityKwhPerSquareMeterYear',
        component: 'heating',
      },
    ],
  })
  const electricity = applyCurrentReferenceFactor({
    energyKwhPerYear: 1,
    component: 'electricity',
    factorPerMwh: null,
  })
  const heating = applyCurrentReferenceFactor({
    energyKwhPerYear: 1,
    component: 'heating',
    factorPerMwh: { status: 'unsupported', reason: 'not-supplied' },
  })
  expect(
    aggregateCompleteCurrentReferenceTotal({ electricity, heating })
  ).toMatchObject({
    status: 'unsupported',
    cause: 'missing-input',
    field: 'factorPerMwh',
    causes: [electricity, heating],
  })
})
