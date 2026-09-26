import {
  formatCalendarDate,
  isEnergymapBuildingInfoValueAvailable,
  getSelectedEnergyConsumption,
  type EnergymapBuildingInfoEnergySelection,
  type EnergymapBuildingInfoPanel,
  type EnergymapBuildingInfoPanelId,
  type EnergymapBuildingInfoValue,
} from './buildingInfo'
import {
  resolveEnergymapBuildingInfoProvenance,
  type EnergymapBuildingInfoProvenanceCalculationId,
  type EnergymapBuildingInfoProvenanceCategoryId,
  type EnergymapBuildingInfoProvenanceInputDefinition,
  type EnergymapBuildingInfoProvenanceInputId,
  type EnergymapBuildingInfoProvenanceMetadataId,
  type EnergymapBuildingInfoProvenanceProviderId,
  type EnergymapBuildingInfoProvenanceId,
  type EnergymapBuildingInfoProvenanceRef,
  type EnergymapBuildingInfoProvenanceSourceId,
  type EnergymapBuildingInfoProvenanceUnsupportedReason,
  type EnergymapEffectiveWaterProjection,
} from './buildingInfoProvenance'

export type EnergymapBuildingInfoProvenanceSummaryItemKind =
  | 'sectionTitle'
  | 'metricLabel'
  | 'row'
  | 'rowValueNote'
  | 'modeledIndicator'
  | 'metricValue'
  | 'metricValueNote'
  | 'primaryMetricValue'
  | 'primaryMetricValueNote'
  | 'residentCountControl'
  | 'energySubmetricValue'
  | 'energySubmetricValueNote'
  | 'combinedEnergyValue'
  | 'combinedEnergyValueNote'
  | 'scenarioValue'
  | 'scenarioValueNote'
  | 'sectionNote'

export type EnergymapBuildingInfoProvenanceSummaryItemId = string

export type EnergymapBuildingInfoProvenanceSummaryLocation = {
  panelId: EnergymapBuildingInfoPanelId
  sectionId: string
  path: EnergymapBuildingInfoProvenanceSummaryItemId
}

export type EnergymapBuildingInfoProvenanceSummaryItem = {
  id: EnergymapBuildingInfoProvenanceSummaryItemId
  kind: EnergymapBuildingInfoProvenanceSummaryItemKind
  location: EnergymapBuildingInfoProvenanceSummaryLocation
  provenanceId: EnergymapBuildingInfoProvenanceId
  fieldKey: string
  categoryId: EnergymapBuildingInfoProvenanceCategoryId
  valueSourceIds: readonly EnergymapBuildingInfoProvenanceSourceId[]
  valueProviderIds: readonly EnergymapBuildingInfoProvenanceProviderId[]
  valueCalculationIds: readonly EnergymapBuildingInfoProvenanceCalculationId[]
  sourceIds: readonly EnergymapBuildingInfoProvenanceSourceId[]
  providerIds: readonly EnergymapBuildingInfoProvenanceProviderId[]
  calculationIds: readonly EnergymapBuildingInfoProvenanceCalculationId[]
  selectedEvidenceInputIds: readonly EnergymapBuildingInfoProvenanceInputId[]
  documentedMethodInputIds: readonly EnergymapBuildingInfoProvenanceInputId[]
  metadataIds: readonly EnergymapBuildingInfoProvenanceMetadataId[]
  sourceLanguage?: 'fi' | 'sv'
  referenceVersion?: string
  referenceLastReviewed?: string
  modelYear?: 2018
}

export type EnergymapBuildingInfoProvenanceSummaryCategory = {
  id: EnergymapBuildingInfoProvenanceCategoryId
  key: string
  itemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
}

export type EnergymapBuildingInfoProvenanceSummarySource = {
  id: EnergymapBuildingInfoProvenanceSourceId
  key: string
  itemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
  directValueItemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
}

export type EnergymapBuildingInfoProvenanceSummaryProvider = {
  id: EnergymapBuildingInfoProvenanceProviderId
  key: string
  itemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
  directValueItemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
}

export type EnergymapBuildingInfoProvenanceSummaryCalculation = {
  id: EnergymapBuildingInfoProvenanceCalculationId
  key: string
  itemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
  directValueItemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
}

export type EnergymapBuildingInfoProvenanceSummaryInput =
  EnergymapBuildingInfoProvenanceInputDefinition & {
    selectedEvidenceItemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
    documentedMethodItemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
  }

export type EnergymapBuildingInfoProvenanceSummaryMetadataValue =
  | string
  | number

export type EnergymapBuildingInfoProvenanceSummaryMetadata = {
  id: EnergymapBuildingInfoProvenanceMetadataId
  key: string
  value?: EnergymapBuildingInfoProvenanceSummaryMetadataValue
  itemIds: readonly EnergymapBuildingInfoProvenanceSummaryItemId[]
}

export type EnergymapBuildingInfoProvenanceSummary = {
  locale: string
  items: readonly EnergymapBuildingInfoProvenanceSummaryItem[]
  categories: readonly EnergymapBuildingInfoProvenanceSummaryCategory[]
  sources: readonly EnergymapBuildingInfoProvenanceSummarySource[]
  providers: readonly EnergymapBuildingInfoProvenanceSummaryProvider[]
  calculations: readonly EnergymapBuildingInfoProvenanceSummaryCalculation[]
  inputs: readonly EnergymapBuildingInfoProvenanceSummaryInput[]
  metadata: readonly EnergymapBuildingInfoProvenanceSummaryMetadata[]
}

export type EnergymapBuildingInfoProvenanceSummaryFailure =
  | {
      failureType: 'catalogResolution'
      location: EnergymapBuildingInfoProvenanceSummaryLocation
      itemKind: EnergymapBuildingInfoProvenanceSummaryItemKind
      reason: EnergymapBuildingInfoProvenanceUnsupportedReason
      id?: string
      inputId?: string
    }
  | {
      failureType: 'duplicatePath'
      location: EnergymapBuildingInfoProvenanceSummaryLocation
      itemKind: EnergymapBuildingInfoProvenanceSummaryItemKind
      reason: 'duplicate-item-path'
    }
  | {
      failureType: 'dynamicEvidenceConflict'
      location: EnergymapBuildingInfoProvenanceSummaryLocation
      itemKind: EnergymapBuildingInfoProvenanceSummaryItemKind
      reason: 'conflicting-dynamic-input-value'
      inputId: EnergymapBuildingInfoProvenanceInputId
    }
  | {
      failureType: 'effectiveWaterTarget'
      location: EnergymapBuildingInfoProvenanceSummaryLocation
      itemKind: 'primaryMetricValue'
      reason:
        | 'missing-effective-water-target'
        | 'ambiguous-effective-water-target'
      targetCount: number
      valueTargetCount: number
      residentCountControlTargetCount: number
    }

export type EnergymapBuildingInfoProvenanceSummaryResult =
  | {
      status: 'resolved'
      summary: EnergymapBuildingInfoProvenanceSummary
    }
  | {
      status: 'contractFailure'
      locale: string
      failures: readonly EnergymapBuildingInfoProvenanceSummaryFailure[]
    }

type CandidateEvidence = {
  provenance?: EnergymapBuildingInfoProvenanceRef
  sourceProperties?: readonly string[]
  sourceLanguage?: string
}

type Candidate = CandidateEvidence & {
  kind: EnergymapBuildingInfoProvenanceSummaryItemKind
  location: EnergymapBuildingInfoProvenanceSummaryLocation
}

type CandidateCollection = {
  candidates: Candidate[]
  failures: EnergymapBuildingInfoProvenanceSummaryFailure[]
}

type MutableCategory = Omit<
  EnergymapBuildingInfoProvenanceSummaryCategory,
  'itemIds'
> & {
  itemIds: EnergymapBuildingInfoProvenanceSummaryItemId[]
}

type MutableDescriptorWithDirectItems<Id extends string> = {
  id: Id
  key: string
  itemIds: EnergymapBuildingInfoProvenanceSummaryItemId[]
  directValueItemIds: EnergymapBuildingInfoProvenanceSummaryItemId[]
}

type MutableInput = EnergymapBuildingInfoProvenanceInputDefinition & {
  selectedEvidenceItemIds: EnergymapBuildingInfoProvenanceSummaryItemId[]
  documentedMethodItemIds: EnergymapBuildingInfoProvenanceSummaryItemId[]
}

type MutableMetadata = Omit<
  EnergymapBuildingInfoProvenanceSummaryMetadata,
  'itemIds'
> & {
  itemIds: EnergymapBuildingInfoProvenanceSummaryItemId[]
}

const pathSegment = (value: string) => encodeURIComponent(value)

const createLocation = ({
  panelId,
  sectionId,
  segments,
}: {
  panelId: EnergymapBuildingInfoPanelId
  sectionId: string
  segments: readonly string[]
}): EnergymapBuildingInfoProvenanceSummaryLocation => ({
  panelId,
  sectionId,
  path: [panelId, sectionId, ...segments].map(pathSegment).join('/'),
})

const getEffectiveWaterTargetLocation = () =>
  createLocation({
    panelId: 'energyConsumption',
    sectionId: 'estimatedConsumption',
    segments: ['primaryMetric', 'water', 'value'],
  })

const getEffectiveWaterTargetFailure = ({
  panels,
}: {
  panels: readonly EnergymapBuildingInfoPanel[]
}): Extract<
  EnergymapBuildingInfoProvenanceSummaryFailure,
  { failureType: 'effectiveWaterTarget' }
> | null => {
  const targets = panels.flatMap((panel) =>
    panel.id !== 'energyConsumption'
      ? []
      : panel.sections.flatMap((section) =>
          section.id !== 'estimatedConsumption'
            ? []
            : (section.consumptionControls?.primaryMetrics ?? []).filter(
                ({ id }) => id === 'water'
              )
        )
  )
  const valueTargetCount = targets.filter(({ value }) => value != null).length
  const residentCountControlTargetCount = targets.filter(
    ({ residentCountControl }) => residentCountControl != null
  ).length

  if (
    targets.length === 1 &&
    valueTargetCount === 1 &&
    residentCountControlTargetCount === 1
  ) {
    return null
  }

  return {
    failureType: 'effectiveWaterTarget',
    location: getEffectiveWaterTargetLocation(),
    itemKind: 'primaryMetricValue',
    reason:
      targets.length > 1 ||
      valueTargetCount > 1 ||
      residentCountControlTargetCount > 1
        ? 'ambiguous-effective-water-target'
        : 'missing-effective-water-target',
    targetCount: targets.length,
    valueTargetCount,
    residentCountControlTargetCount,
  }
}

const collectCandidates = ({
  panels,
  effectiveWaterProjection,
  energySelection,
}: {
  panels: readonly EnergymapBuildingInfoPanel[]
  effectiveWaterProjection?: EnergymapEffectiveWaterProjection
  energySelection?: EnergymapBuildingInfoEnergySelection
}): CandidateCollection => {
  const candidates: Candidate[] = []
  const failures: EnergymapBuildingInfoProvenanceSummaryFailure[] = []
  const paths = new Set<EnergymapBuildingInfoProvenanceSummaryItemId>()

  const add = ({
    location,
    kind,
    evidence,
  }: {
    location: EnergymapBuildingInfoProvenanceSummaryLocation
    kind: EnergymapBuildingInfoProvenanceSummaryItemKind
    evidence: CandidateEvidence
  }) => {
    if (paths.has(location.path)) {
      failures.push({
        failureType: 'duplicatePath',
        location,
        itemKind: kind,
        reason: 'duplicate-item-path',
      })
      return
    }

    paths.add(location.path)
    candidates.push({
      location,
      kind,
      ...(evidence.provenance == null
        ? {}
        : { provenance: evidence.provenance }),
      ...(evidence.sourceProperties == null
        ? {}
        : { sourceProperties: evidence.sourceProperties }),
      ...(evidence.sourceLanguage == null
        ? {}
        : { sourceLanguage: evidence.sourceLanguage }),
    })
  }

  const addValue = ({
    location,
    kind,
    noteKind,
    value,
  }: {
    location: EnergymapBuildingInfoProvenanceSummaryLocation
    kind: EnergymapBuildingInfoProvenanceSummaryItemKind
    noteKind: EnergymapBuildingInfoProvenanceSummaryItemKind
    value: EnergymapBuildingInfoValue
  }) => {
    add({ location, kind, evidence: value })
    if (value.note != null) {
      add({
        location: {
          ...location,
          path: `${location.path}/note`,
        },
        kind: noteKind,
        evidence: value.note,
      })
    }
  }

  for (const panel of panels) {
    for (const section of panel.sections) {
      const location = (segments: readonly string[]) =>
        createLocation({ panelId: panel.id, sectionId: section.id, segments })

      for (const row of section.rows ?? []) {
        const rowLocation = location(['row', row.id])
        addValue({
          location: rowLocation,
          kind: 'row',
          noteKind: 'rowValueNote',
          value: row,
        })
        if (row.modeledIndicator != null) {
          add({
            location: {
              ...rowLocation,
              path: `${rowLocation.path}/modeledIndicator`,
            },
            kind: 'modeledIndicator',
            evidence: row.modeledIndicator,
          })
        }
      }

      for (const metric of section.consumptionControls == null
        ? (section.metrics ?? [])
        : []) {
        if (
          metric.labelProvenance != null ||
          metric.labelSourceProperties != null
        ) {
          add({
            location: location(['metric', metric.id, 'label']),
            kind: 'metricLabel',
            evidence: {
              provenance: metric.labelProvenance,
              sourceProperties: metric.labelSourceProperties,
            },
          })
        }
        for (const value of metric.values) {
          addValue({
            location: location(['metric', metric.id, 'value', value.id]),
            kind: 'metricValue',
            noteKind: 'metricValueNote',
            value,
          })
        }
      }

      const controls = section.consumptionControls
      if (controls != null) {
        for (const primaryMetric of controls.primaryMetrics) {
          if (
            energySelection != null &&
            primaryMetric.id !== energySelection.primaryMetricId
          )
            continue
          const isEffectiveWaterTarget =
            panel.id === 'energyConsumption' &&
            section.id === 'estimatedConsumption' &&
            primaryMetric.id === 'water'
          const value =
            isEffectiveWaterTarget && effectiveWaterProjection != null
              ? effectiveWaterProjection.value
              : primaryMetric.value
          const residentCountControl =
            isEffectiveWaterTarget && effectiveWaterProjection != null
              ? effectiveWaterProjection.residentCountControl
              : primaryMetric.residentCountControl

          if (
            value != null &&
            (!isEffectiveWaterTarget ||
              effectiveWaterProjection == null ||
              isEnergymapBuildingInfoValueAvailable(value))
          ) {
            addValue({
              location: location(['primaryMetric', primaryMetric.id, 'value']),
              kind: 'primaryMetricValue',
              noteKind: 'primaryMetricValueNote',
              value,
            })
          }

          if (residentCountControl != null) {
            add({
              location: location([
                'primaryMetric',
                primaryMetric.id,
                'residentCountControl',
              ]),
              kind: 'residentCountControl',
              evidence: residentCountControl,
            })
          }
        }

        const selected =
          energySelection == null
            ? undefined
            : getSelectedEnergyConsumption({ controls, ...energySelection })
        const metrics =
          energySelection == null
            ? [
                ...(controls.energySubmetrics ?? []).map(
                  ({ metric }) => metric
                ),
                ...(controls.combinedEnergyMetric
                  ? [controls.combinedEnergyMetric]
                  : []),
              ]
            : energySelection.primaryMetricId === 'energy' &&
                selected?.metric != null
              ? [selected.metric]
              : []
        for (const metric of metrics) {
          const segments = ['energySubmetric', metric.id, 'metric', metric.id]
          if (
            (metric.labelProvenance != null ||
              metric.labelSourceProperties != null) &&
            selected?.basisId !== 'registryFloorArea'
          ) {
            add({
              location: location([...segments, 'label']),
              kind: 'metricLabel',
              evidence: {
                provenance: metric.labelProvenance,
                sourceProperties: metric.labelSourceProperties,
              },
            })
          }
          const families =
            energySelection != null
              ? [{ id: selected?.basisId, values: selected?.values ?? [] }]
              : (metric.bases ?? [{ id: undefined, values: metric.values }])
          for (const family of families) {
            for (const value of family.values) {
              addValue({
                location: location([
                  ...segments,
                  ...(family.id ? ['basis', family.id] : []),
                  'value',
                  value.id,
                ]),
                kind: 'energySubmetricValue',
                noteKind: 'energySubmetricValueNote',
                value,
              })
            }
          }
        }
      }

      for (const scenario of section.scenarios ?? []) {
        for (const value of scenario.values) {
          addValue({
            location: location(['scenario', scenario.id, 'value', value.id]),
            kind: 'scenarioValue',
            noteKind: 'scenarioValueNote',
            value,
          })
        }
      }

      for (const note of section.notes ?? []) {
        add({
          location: location(['note', note.id]),
          kind: 'sectionNote',
          evidence: note,
        })
      }
    }
  }

  return { candidates, failures }
}

const appendUnique = <Value>(values: Value[], value: Value) => {
  if (!values.includes(value)) values.push(value)
}

const addDescriptorAssociations = <Id extends string>({
  descriptors,
  directValueDescriptors,
  registry,
  itemId,
}: {
  descriptors: readonly { id: Id; key: string }[]
  directValueDescriptors: readonly { id: Id; key: string }[]
  registry: Map<Id, MutableDescriptorWithDirectItems<Id>>
  itemId: EnergymapBuildingInfoProvenanceSummaryItemId
}) => {
  const getOrCreate = (descriptor: { id: Id; key: string }) => {
    let summaryDescriptor = registry.get(descriptor.id)
    if (summaryDescriptor == null) {
      summaryDescriptor = {
        ...descriptor,
        itemIds: [],
        directValueItemIds: [],
      }
      registry.set(descriptor.id, summaryDescriptor)
    }
    return summaryDescriptor
  }

  for (const descriptor of descriptors) {
    appendUnique(getOrCreate(descriptor).itemIds, itemId)
  }
  for (const descriptor of directValueDescriptors) {
    const summaryDescriptor = getOrCreate(descriptor)
    appendUnique(summaryDescriptor.itemIds, itemId)
    appendUnique(summaryDescriptor.directValueItemIds, itemId)
  }
}

const cloneInputDefinition = (
  input: EnergymapBuildingInfoProvenanceInputDefinition
): MutableInput => ({
  ...input,
  ...(input.providerIds == null ? {} : { providerIds: [...input.providerIds] }),
  ...(input.metadataIds == null ? {} : { metadataIds: [...input.metadataIds] }),
  ...(input.details == null ? {} : { details: { ...input.details } }),
  selectedEvidenceItemIds: [],
  documentedMethodItemIds: [],
})

const getMetadataValue = ({
  metadataId,
  metadata,
  locale,
}: {
  metadataId: EnergymapBuildingInfoProvenanceMetadataId
  locale: string
  metadata: {
    sourceLanguage?: 'fi' | 'sv'
    referenceVersion?: string
    referenceLastReviewed?: string
    modelYear?: 2018
    dynamicValues?: Readonly<
      Partial<
        Record<
          EnergymapBuildingInfoProvenanceMetadataId,
          EnergymapBuildingInfoProvenanceSummaryMetadataValue
        >
      >
    >
  }
}): EnergymapBuildingInfoProvenanceSummaryMetadataValue | undefined => {
  if (
    metadata.dynamicValues != null &&
    Object.hasOwn(metadata.dynamicValues, metadataId)
  ) {
    const value = metadata.dynamicValues[metadataId]
    if (
      (metadataId === 'certificateSignedAt' ||
        metadataId === 'certificateValidUntil') &&
      typeof value === 'string'
    ) {
      return formatCalendarDate({ value, locale }) ?? value
    }
    if (metadataId === 'certificateHeatedArea' && typeof value === 'number') {
      return new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
      }).format(value)
    }
    return value
  }

  switch (metadataId) {
    case 'sourceLanguage':
      return metadata.sourceLanguage
    case 'referenceVersion':
      return metadata.referenceVersion
    case 'referenceLastReviewed':
      return metadata.referenceLastReviewed
    case 'modeledClass2018':
      return metadata.modelYear
    default:
      return undefined
  }
}

const metadataIdentity = ({
  id,
  value,
}: {
  id: EnergymapBuildingInfoProvenanceMetadataId
  value?: EnergymapBuildingInfoProvenanceSummaryMetadataValue
}) => JSON.stringify([id, value ?? null])

export const deriveEnergymapBuildingInfoProvenanceSummary = ({
  panels,
  locale,
  effectiveWaterProjection,
  energySelection,
}: {
  panels: readonly EnergymapBuildingInfoPanel[] | null
  locale: string
  effectiveWaterProjection?: EnergymapEffectiveWaterProjection
  energySelection?: EnergymapBuildingInfoEnergySelection
}): EnergymapBuildingInfoProvenanceSummaryResult | null => {
  if (panels == null && effectiveWaterProjection == null) return null

  const currentPanels = panels ?? []
  if (effectiveWaterProjection != null) {
    const targetFailure = getEffectiveWaterTargetFailure({
      panels: currentPanels,
    })
    if (targetFailure != null) {
      return {
        status: 'contractFailure',
        locale,
        failures: [targetFailure],
      }
    }
  }

  const collection = collectCandidates({
    panels: currentPanels,
    effectiveWaterProjection,
    energySelection,
  })
  if (collection.failures.length > 0) {
    return {
      status: 'contractFailure',
      locale,
      failures: collection.failures,
    }
  }

  const failures: EnergymapBuildingInfoProvenanceSummaryFailure[] = []
  const resolvedCandidates: Array<{
    candidate: Candidate
    resolution: Extract<
      ReturnType<typeof resolveEnergymapBuildingInfoProvenance>,
      { status: 'resolved' }
    >
  }> = []

  for (const candidate of collection.candidates) {
    const resolution = resolveEnergymapBuildingInfoProvenance({
      provenance: candidate.provenance,
      sourceProperties: candidate.sourceProperties,
      sourceLanguage: candidate.sourceLanguage,
    })
    if (resolution.status === 'unsupported') {
      failures.push({
        failureType: 'catalogResolution',
        location: candidate.location,
        itemKind: candidate.kind,
        reason: resolution.reason,
        ...(resolution.id == null ? {} : { id: resolution.id }),
        ...(resolution.inputId == null ? {} : { inputId: resolution.inputId }),
      })
      continue
    }

    resolvedCandidates.push({ candidate, resolution })
  }

  if (failures.length > 0) {
    return { status: 'contractFailure', locale, failures }
  }

  const dynamicInputValues = new Map<
    EnergymapBuildingInfoProvenanceInputId,
    string | number
  >()
  for (const { candidate, resolution } of resolvedCandidates) {
    for (const input of resolution.selectedEvidence) {
      if (input.runtimeValueType == null || input.value == null) continue

      if (!dynamicInputValues.has(input.id)) {
        dynamicInputValues.set(input.id, input.value)
        continue
      }

      if (!Object.is(dynamicInputValues.get(input.id), input.value)) {
        failures.push({
          failureType: 'dynamicEvidenceConflict',
          location: candidate.location,
          itemKind: candidate.kind,
          reason: 'conflicting-dynamic-input-value',
          inputId: input.id,
        })
      }
    }
  }

  if (failures.length > 0) {
    return { status: 'contractFailure', locale, failures }
  }

  const items: EnergymapBuildingInfoProvenanceSummaryItem[] = []
  const categories = new Map<
    EnergymapBuildingInfoProvenanceCategoryId,
    MutableCategory
  >()
  const sources = new Map<
    EnergymapBuildingInfoProvenanceSourceId,
    MutableDescriptorWithDirectItems<EnergymapBuildingInfoProvenanceSourceId>
  >()
  const providers = new Map<
    EnergymapBuildingInfoProvenanceProviderId,
    MutableDescriptorWithDirectItems<EnergymapBuildingInfoProvenanceProviderId>
  >()
  const calculations = new Map<
    EnergymapBuildingInfoProvenanceCalculationId,
    MutableDescriptorWithDirectItems<EnergymapBuildingInfoProvenanceCalculationId>
  >()
  const inputs = new Map<EnergymapBuildingInfoProvenanceInputId, MutableInput>()
  const metadata = new Map<string, MutableMetadata>()

  for (const { candidate, resolution } of resolvedCandidates) {
    const itemId = candidate.location.path
    const item: EnergymapBuildingInfoProvenanceSummaryItem = {
      id: itemId,
      kind: candidate.kind,
      location: { ...candidate.location },
      provenanceId: resolution.definition.id,
      fieldKey: resolution.definition.fieldKey,
      categoryId: resolution.category.id,
      valueSourceIds: resolution.valueSources.map(({ id }) => id),
      valueProviderIds: resolution.valueProviders.map(({ id }) => id),
      valueCalculationIds: resolution.valueCalculations.map(({ id }) => id),
      sourceIds: resolution.sources.map(({ id }) => id),
      providerIds: resolution.providers.map(({ id }) => id),
      calculationIds: resolution.calculations.map(({ id }) => id),
      selectedEvidenceInputIds: resolution.selectedEvidence.map(({ id }) => id),
      documentedMethodInputIds: resolution.documentedMethodInputs.map(
        ({ id }) => id
      ),
      metadataIds: resolution.metadata.descriptors.map(({ id }) => id),
      ...(resolution.metadata.sourceLanguage == null
        ? {}
        : { sourceLanguage: resolution.metadata.sourceLanguage }),
      ...(resolution.metadata.referenceVersion == null
        ? {}
        : { referenceVersion: resolution.metadata.referenceVersion }),
      ...(resolution.metadata.referenceLastReviewed == null
        ? {}
        : {
            referenceLastReviewed: resolution.metadata.referenceLastReviewed,
          }),
      ...(resolution.metadata.modelYear == null
        ? {}
        : { modelYear: resolution.metadata.modelYear }),
    }
    items.push(item)

    let category = categories.get(resolution.category.id)
    if (category == null) {
      category = { ...resolution.category, itemIds: [] }
      categories.set(category.id, category)
    }
    appendUnique(category.itemIds, itemId)

    addDescriptorAssociations({
      descriptors: resolution.sources,
      directValueDescriptors: resolution.valueSources,
      registry: sources,
      itemId,
    })
    addDescriptorAssociations({
      descriptors: resolution.providers,
      directValueDescriptors: resolution.valueProviders,
      registry: providers,
      itemId,
    })
    addDescriptorAssociations({
      descriptors: resolution.calculations,
      directValueDescriptors: resolution.valueCalculations,
      registry: calculations,
      itemId,
    })

    for (const input of resolution.selectedEvidence) {
      let summaryInput = inputs.get(input.id)
      if (summaryInput == null) {
        summaryInput = cloneInputDefinition(input)
        inputs.set(input.id, summaryInput)
      }
      appendUnique(summaryInput.selectedEvidenceItemIds, itemId)
    }
    for (const input of resolution.documentedMethodInputs) {
      let summaryInput = inputs.get(input.id)
      if (summaryInput == null) {
        summaryInput = cloneInputDefinition(input)
        inputs.set(input.id, summaryInput)
      }
      appendUnique(summaryInput.documentedMethodItemIds, itemId)
    }

    for (const descriptor of resolution.metadata.descriptors) {
      const value = getMetadataValue({
        metadataId: descriptor.id,
        metadata: resolution.metadata,
        locale,
      })
      const identity = metadataIdentity({ id: descriptor.id, value })
      let summaryMetadata = metadata.get(identity)
      if (summaryMetadata == null) {
        summaryMetadata = {
          ...descriptor,
          ...(value == null ? {} : { value }),
          itemIds: [],
        }
        metadata.set(identity, summaryMetadata)
      }
      appendUnique(summaryMetadata.itemIds, itemId)
    }
  }

  return {
    status: 'resolved',
    summary: {
      locale,
      items,
      categories: [...categories.values()],
      sources: [...sources.values()],
      providers: [...providers.values()],
      calculations: [...calculations.values()],
      inputs: [...inputs.values()],
      metadata: [...metadata.values()],
    },
  }
}
