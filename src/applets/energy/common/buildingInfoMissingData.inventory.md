# Building information source-reason inventory

F098.2 implements local evidence and truthful legacy uncertainty. No new upstream
diagnostic fields, source imports, backend writes or GeoServer publication are
part of this contract.

Canonical table (read in full on 2026-09-26):

- Mounted: `/workspace/external/energymap/tasks/improve-building-info/missing-data-reference.md`
- Host: `/home/xbexbex/syncthing/work/avoin/projects/energymap/tasks/improve-building-info/missing-data-reference.md`
- Read-only mirror: `/host/home/xbexbex/syncthing/work/avoin/projects/energymap/tasks/improve-building-info/missing-data-reference.md`
- Mount: `ENERGYMAP_EXTERNAL_DOCS=/workspace/external/energymap`; `.codex-orch/external-docs.md`.

`buildingInfoMissingData.ts` owns the inventory before display pruning. Each
emitted item has semantic `evidence` and required localized `reason` text. Its
`inventory` records available, missing and explicitly excluded product fields.
The inventory uses product quantities, not certificate-card presence. An absent
published property establishes neither a source blank nor a failed source join.

## Table rows and product applicability

`D`, `E`, and `R` below expand to `buildingDetails`, `energyConsumption`, and
`renovationRecommendations`. `annualTotal`, `perSquareMeter`, and `savingsPercent`
are separate semantic quantities, even when one ordinary row displays them.

| Canonical table row | Semantic fields | Source and applicability / exclusion | Behavioral coverage |
| --- | --- | --- | --- |
| Address and components | D.address; D.address.street, D.address.postalCode, D.address.postalOffice | Ryhti address data. A wholly missing address contains component dependencies; partial rows retain survivors and expose only unavailable parts. | MissingData: composite survivors; invalid text and leading zeroes |
| Permanent building ID | D.buildingIdentifier | Ryhti, opaque string; no numeric coercion, invented checksum or alternate identity. Missing identity cannot verify a certificate link, but does not prove a failed import join. | MissingData: received fields/opaque IDs; parser identity tests |
| Property ID | D.propertyIdentifier | Ryhti snapshot; exact nonzero 14-digit text, leading zeroes retained. No tenure inference. | MissingData: absent, numeric, padded, truncated, zero IDs |
| Construction year | D.constructionYear | Ryhti completion calendar date or supported year-only input. Impossible dates are locally invalid. | Evidence: completion matrix; MissingData: invalid dates |
| Building type | D.buildingType | Ryhti purpose. Unknown populated codes remain available; model support is independent. | MissingData: FI/SV and unknown codes; coverage matrix |
| Heating and components | D.heating; D.heating.source, D.heating.method | Ryhti source/method. Partial rows survive; electric heating needs a method to resolve boiler/direct heating. | MissingData: composites and coverage |
| Effective class | D.energyClass | Supplied effective class remains available with unknown origin/code. When absent, official-source uncertainty is separate from modeled fallback. All seven established model codes and a future-code fallback are consumed. | MissingData: modeled-code matrix; unknown origin/history |
| Certificate validity | D.energyCertificateValidity | Public certificate register expiry. Past dates are historical facts; invalid dates are distinct from omission. | MissingData: received fields; historical dates |
| Previous class | D.previousEnergyClass | Public certificate register history. Omission does not establish no earlier certificate. | MissingData: origin/history regression |
| Heated net area | D.heatedNetArea | Public certificate register; positive finite area only. No Ryhti replacement. | MissingData: zero/negative/nonfinite/blank |
| Ventilation type | D.ventilationType | Public certificate code and supplied FI/SV label. Known-code missing-label differs from unrecognized code; a usable label needs no known code. | MissingData: ventilation matrix/source fallback; existing BuildingInfo ventilation tests |
| Ventilation description | D.ventilation | Original public certificate FI then SV text. An available alternate satisfies the field in FI and EN. | MissingData: invalid FI, valid SV; existing BuildingInfo source-text tests |
| Ventilation category | D.ventilationCategory | Energy Map classification of certificate data. `no_info` means unknown, never no system. Supplied `other` survives; no client reclassification. | MissingData: classification/no-info; existing BuildingInfo ventilation tests |
| Total, heating, electricity | E.total, E.heating, E.electricity × annualTotal/perSquareMeter | Energy Map consumption references. Annual needs positive Ryhti floor area; intensity does not. Preserve supported zero outputs; documented type/heating/scenario exclusions take precedence over populated reference columns. | MissingData: each quantity's independent operands, negative/nonfinite/overflow, zero |
| Cost | E.cost | Approved Energy Map prices and complete purchased-energy components. Preserve nested failure, field, component, reference reason and resolved factor context. Apartment pellet price is explicitly absent. | MissingData: pellet adapter; CurrentReferenceCalculations factor/aggregation tests |
| CO₂ | E.co2 | Approved fossil-accounting factors and complete components. Zero pellet factor is valid; no lifecycle or measurement claim. | CurrentReferenceCalculations zero/factor/complete totals; MissingData operand retention |
| Initial resident estimate | Dependency of E.water | Positive Ryhti area / 41.6, half-up, clamped 1–10,000. No standalone missing resident row and no resident-register claim. | Existing CurrentReferenceCalculations occupancy tests; Evidence Water tests |
| Water | E.water | Approved 43.8 m³/person/year reference using effective default/override. Empty, invalid and out-of-range drafts have distinct reasons. Valid override supersedes absent default. | Evidence Water matrix; Panel pointer/keyboard/blur/reopen/reset tests |
| Certificate recommendations | R.energyCertificateRecommendations | Public certificate FI/SV prose. Absence does not mean renovation is unnecessary. | MissingData source alternatives; existing BuildingInfo source text tests |
| AAHP | R.aahp × annualTotal/perSquareMeter/savingsPercent | Project scenario; no apartment AAHP, no detached GSHP/AWHP AAHP. Enumeration precedes ordinary pruning. | MissingData coverage and each savings scenario |
| Solar | R.solar × annualTotal/perSquareMeter/savingsPercent | Project scenario; reference intensity + area for annual, positive baseline + scenario for savings. Not installed equipment evidence. | MissingData coverage and independent operands |
| Windows/doors | R.windows × annualTotal/perSquareMeter/savingsPercent | Project scenario; same independent operands. Valid increases and zero savings survive. | MissingData savings matrix |
| Certificate envelope | E.certificateConsumption | Semantic fallback record: absent versus typed local rejection. No subordinate source-blank diagnoses from a rejected envelope. Hidden under complete reference Energy. | Parser full compatibility/detailed suites; MissingData suppression/F099 seam |
| Five standard annual carriers | E.certificateElectricity, E.certificateDistrictHeat, E.certificateDistrictCooling, E.certificateFossilFuel, E.certificateRenewableFuel × annualTotal | Public certificate normalized purchased energy. Each missing standard carrier in an accepted partial record gets source-specific normalization uncertainty. Cooling/fuels retain original meanings. | MissingData each omitted carrier; zero/partial parser tests |
| Five standard intensities | Same five fields × perSquareMeter | Corresponding annual quantity / positive area in the same accepted certificate. Both failing operands survive; no registry/detail area substitution. | MissingData partial/no-area tests; Evidence unrepresentable intensity |
| Used optional slots | E.certificateOther0, E.certificateOther1, E.certificateOther2 × annualTotal/perSquareMeter | Only accepted used slots; source names are inert text; unnamed quantities use existing localized slot labels. Omitted legacy slots have unknown usage. | Parser named/unnamed/duplicates; MissingData optional-slot test |
| Complete certificate total | E.certificateTotal.annualTotal | Only declared complete, validated totals. Partial sum never becomes a total; identify known missing carriers and unknown optional normalization loss. | Parser totals/tolerance; MissingData all-standard partial and office regression |
| Complete certificate intensity | E.certificateTotal.perSquareMeter | Complete total / same-certificate area, retaining both dependencies. | MissingData partial total and same-certificate area |
| Envelope ID/version/basis/unit/completeness | Rejection evidence, no duplicate rows | Strict single parser; compatibility wrapper returns identical accepted records. | Parser rejection table, all existing acceptance tests |
| Signed/expiry/area metadata | Local parser metadata outcomes or existing product fields | Optional invalid metadata does not reject valid energy. No hidden signed-date product row. | Parser metadata matrix; MissingData annual survival |
| Model inputs | Dependencies of affected outputs | Ryhti purpose/age/heating/area/storeys and modeled permitted-area context; no standalone hidden-input rows. | MissingData modeled/reference/annual dependencies |

Coverage for default/solar/windows is detached `awhp,delec,distr,elecb,gshp,oil,wood`
and apartment `awhp,delec,distr,gshp,oil`. AAHP is detached-only for
`delec,distr,elecb,oil,wood`. No other purpose has these reference tables. The
published heating-code resolver has no AWHP route; a populated AWHP column does
not identify installed equipment. One shared coverage resolver gates reference presentation and missing reasons, even
when unsupported columns contain numeric values. This does not reject independent
certificate quantities or change Cost/CO₂ factor inputs (including the apartment
pellet-price failure); it makes no claim about which stored-model job ran.

## Intentional exclusions

| Table concept | Product basis |
| --- | --- |
| Water-heating share | No approved separating formula/source |
| General renovation or energy advice | No general building-specific recommendation source; certificate recommendations are separate |
| Energy-class improvement measures | No measure-to-official-class contract |
| Planned works | No linked works/project dataset |
| Plot tenure | No ownership/lease source; property ID is not tenure |
| Optional certificate slots without usage evidence | Not established product quantities; unknown dropped slots remain total-level uncertainty |
| Certificate fallback under complete reference Energy | Intentionally unused alternative; no payload or carrier gaps |
| Hidden metadata, source/provider labels, alternate source language, selector labels | Duplicate context or evidence, not additional product quantities |
| Other heating-change scenarios | Outside the current AAHP/solar/windows product scope |

## F099 interface and regression contract

- `parseEnergyCertificateConsumptionOutcome` is the sole detailed parser;
  `parseEnergyCertificateConsumption` remains its nullable compatibility wrapper.
  The production factory parses once. Use accepted metadata outcomes rather than
  another raw JSON path.
- `collectMissingBuildingInfo` receives semantic candidates and an optional
  `effectiveAvailability` map. Filled quantities are `available`; unused
  alternatives are `excluded`. It never looks up a certificate-card section ID.
  Adapt this map to F099's resolved quantities; purchased electricity, auxiliary
  electricity and cooling are not interchangeable.
- `resolveEffectiveWaterOutcome` supplies a shared calculation and missing reason.
  `getEnergymapEffectiveWaterProjection` uses it without changing the existing
  local input/disclosure lifecycle. For residential purposes `05`/`06`, the
  ordinary Water editor remains reachable when the default fails. Its nullable
  `defaultValue` and retained `defaultFloorArea` keep input availability separate
  from output availability: no missing-value row or fabricated default is shown.
  A valid override reveals Water and clears only its missing item; disabling it
  restores the original area reason. Mounted panel tests cover absent/zero/invalid
  area, edits, blur/disclosure and building reset; `water-no-default-en/fi` and
  `source-invalid-en/fi` provide production-factory UI fixtures. Existing usable
  defaults remain supported, and details-only/unknown-purpose selections do not
  acquire an unsolicited residential calculation.
- F099 owns Energy fallback integration, compatible source arithmetic, control
  mappings, card removal and available-value provenance. Cost/CO₂/Water and
  renovation inputs continue using current reference inputs.
- Preserve office `1036581819` / building key
  `1752c0cc-65e2-45d5-938a-b47f09349ae4`: purpose `02`, Ryhti area zero, official C;
  certificate 318510, 2018, area 22707.2; annual electricity 1196074, district heat
  2994881, cooling 197293, fossil/renewable zero, total 4388248. It remains a
  standardized calculation, not measured consumption.

## Evidence boundaries and service-owned gaps

Established locally: received invalid fields, parser rejection categories,
calculation operands/factors/arithmetic, existing modeled-class codes, documented
reference coverage and effective Water input. Legacy uncertainty remains explicit
for omitted published fields, missing certificate/history facts, absent stored
model outputs and normalized-away certificate carriers/optional slots.

The service at `/home/xbexbex/git/avoin-energy-map-service` owns future identity-
bound, versioned diagnostics with source vintage/publication revision, independent
Ryhti joins/field outcomes, certificate match/history, stored-model generation
outcomes and carrier/optional-slot normalization states. The parent architecture
is semantic, not a wire schema. This change neither invents wire properties nor
claims those diagnostics are live.

Local review approval does not authorize a commit, push, merge, deployment,
backend import/write or GeoServer/cache publication. Hold at the review boundary
and propagate that restriction to F099.

## Reviewer-fix regressions

- Populated detached GSHP/AAHP, apartment AAHP, apartment wood/electric-boiler
  and office references stay unavailable in ordinary reference estimates and
  retain coverage reasons for annual, intensity and savings quantities. Supported
  zeroes and independent certificate quantities remain available.
- Invalid effective class attribution follows strict boolean origin evidence:
  modeled → class model, official → certificate register, absent/invalid origin
  → selected published dataset with upstream origin explicitly unknown. The
  official-availability uncertainty and modeled-fallback reason remain separate.
  Unknown-but-usable class codes remain visible.
- `buildingInfoMissingData.test.ts` covers presentation and structured reasons;
  `BuildingInfoProvenanceView.locales.test.tsx` checks all three origins through
  real FI/EN Tolgee resources. The `source-coverage-*` fixtures reproduce these
  distinctions through the production factory.
- Water reason validation reuses the current calculator and approved occupancy
  bounds. The existing edit/default/reset contract is unchanged.
