# Energy area boundary and fixture handoff

F101.1 supplies data access and vector source descriptions. It does not register
map layers, change building selection or render UI. No deployed area API or
nationally active release has been verified. Fixtures prove local behavior only.

## Public configuration

`PUBLIC_ENERGY_AREA_API_ORIGIN` is an optional, non-secret **service origin**,
for example `https://energy-api.example.test` (documentation example only).
It is not an API prefix, GeoServer base or workspace. Leave it blank until the
intended service is verified. Start embeds explicitly accessed `PUBLIC_*` values
in browser code; do not put credentials in this setting. The setting is documented
in `.env.template`; no `.env` or shared-runtime configuration was changed.

An origin permits HTTP(S), an optional trailing root slash and surrounding
configuration whitespace. Paths, credentials, query strings and fragments are
rejected. Unset browser defines are safe even without a global `process`.
`getEnergyAreaApiConfig()` returns `{ok:true, config:{origin}}` or
`{ok:false, problem}`. Handle this problem before a disabled query's pending state;
missing configuration performs no request and never enables fixture data.

Metadata and detail use the fixed `/energy-data/areas` API prefix. Advertised
service-root-relative tile templates are prefixed with the normalized origin.
Absolute HTTP(S) templates retain their original spelling, escapes, query
parameters and `{z}/{x}/{y}` placeholders. The client never serializes a tile
URL through `URL.href`, rewrites Y, adds a release parameter to advertised tiles
or guesses a GeoServer workspace.

## Actual exported interfaces

- `common/types/areas.ts`: `AreaLevel`, `AreaIdentity`, `AreaDetailRequest`,
  `AreaMetadata`, `AreaDetail`, `AreaMetrics`, `AreaTileProperties`,
  `AreaApiConfigResult`, `AreaApiProblem`, `AreaFetch`.
- `common/areas/config.ts`: `getEnergyAreaApiConfig`,
  `resolveEnergyAreaApiConfig({origin})`, `resolveAreaTileUrl({config,template})`.
- `common/areas/contract.ts`: `AREA_LEVELS`, `AREA_METRIC_VERSION`,
  `parseAreaReleaseId`, `parseAreaDetailRequest`,
  `parseAreaMetadata(payload,{requestedReleaseId?})`,
  `parseAreaDetail(payload,{request})`,
  `parseAreaTileProperties(payload,{releaseId,level})`.
- `common/areas/errors.ts`: `AreaApiError`, with a safe developer `problem`.
- `common/areas/client.ts`: `fetchAreaMetadata({config,releaseId?,signal?,fetchFn?})`
  and `fetchAreaDetail({config,request,signal?,fetchFn?})`.
- `common/areas/queries.ts`: `areaQueryKeys`, `areaMetadataQueryOptions`,
  `areaDetailQueryOptions`, `AREA_METADATA_STALE_TIME`, `retryAreaQuery`.
- `layers/areaSource.ts`: `createAreaSourceDescriptors({config,metadata})`,
  `AreaSourceDescriptor`, `areaSourceDescriptorSignature(descriptors)`.

Paths above are relative to `src/applets/energy`. Parsers return validated values
or throw `AreaApiError`; transport uses the same error type. Input UUIDs are
canonicalized to lowercase, including in keys and echoed identity checks. Codes
remain exactly 5/3/2 ASCII digits for postal/municipality/region. Never use numeric
MVT feature IDs in place of `area_id`.

Errors distinguish `not-configured`, `invalid-config`, `unavailable` (503),
`not-found` (404), `rejected-request` (422 or invalid local input),
`malformed-contract`, `unsupported-contract`, `network`, and other `http` status.
HTTP status survives non-JSON bodies. Schema diagnostics contain issue paths and
codes; arbitrary upstream error bodies and input values are not copied. Aborts
remain cancellation and never become network errors or cached success. UI
siblings localize by problem kind; diagnostics are not product copy.

Required metadata flags/descriptors, response identity, scope, metric version,
dates, counts and known metric blocks are validated. Unknown manifests,
distribution categories, diagnostic keys and extra metric data are preserved.
Sparse/empty scale maps, `{}` metrics and canonical structured empty metrics are
accepted. Optional source-language names and absent/null compact coverage stay
absent/null; numeric zero remains zero. The boundary does not recalculate
coverage, combine scales, reinterpret diagnostics, fill missing metrics, infer a
dominant class or merge the four area definitions.

## Provider QueryClient consumption

Use the `ShellProvider` QueryClient through normal `useQuery`/`useQueryClient`.
No new QueryClient, singleton, result cache, map store or global selection is
introduced by this boundary. Example imports use the applet alias:

```tsx
const config = getEnergyAreaApiConfig()
const metadataQuery = useQuery(areaMetadataQueryOptions({ config }))
// Optional releaseId selects a validated retained/candidate release instead.
const detailQuery = useQuery(areaDetailQueryOptions({
  config,
  request: selectedArea ? {
    releaseId: committedMetadata.release_id,
    level: selectedArea.level,
    areaCode: selectedArea.areaCode,
    municipalityCode: selectedArea.municipalityCode,
  } : undefined,
}))
```

`committedMetadata` and selection in this sketch belong to F101.2's atomic map
transition. A newly fetched metadata response must not immediately mix new
sources with an old selected detail. Query options capture immutable request and
configuration inputs; responses must echo their release, level, code and scope.
There is no previous-data placeholder across keys.

Keys are `['energyAreas', origin, 'metadata', releaseId ?? 'active']` and
`['energyAreas', origin, 'detail', releaseId, level, areaCode, municipalityCode ?? null]`.
Neither locale, pan, zoom nor building filters participates. Every detail request
explicitly sends `release_id`. Full postal geometry/tile shading never changes
when `municipalityCode` restricts detail statistics; relations remain the full
crosswalk. Global/manual postal navigation must clear this scope in F101.3.

Metadata uses a 60-second stale window, normal focus/reconnect refetch and no
interval. Intentional refresh inside that window can use `metadataQuery.refetch()`
or provider-client `invalidateQueries({queryKey:areaQueryKeys.metadata({config}), exact:true})`.
Pinned details use `staleTime: Infinity`, with intentional retry/refetch available.
Only network/503 failures retry automatically, at most twice. Other errors and
cancellation do not retry automatically.

Before replacing selection/release or exiting, use the provider's
`cancelQueries({queryKey:areaQueryKeys.details({config})})` (or an exact superseded
key). R1 results can only populate R1 keys; cancellation prevents late success even
with a noncooperative transport. F101.2 owns clearing the selected identity and
committing the source/selection transition.

Source descriptors return `{releaseId,level,sourceId,sourceLayer,source}` for all
three levels. The vector source promotes `area_id`, uses the advertised source
layer, min/max zoom and scheme (omitted scheme defaults XYZ). Legal source zooms
are integer 0–25 with min <= max; native delivery uses 0–14. These are source
fetch/overzoom limits, not exclusive layer visibility limits. Compare
`areaSourceDescriptorSignature()` on every accepted metadata refresh, including
same-release descriptor changes. F101.2 owns safe registration, replacement,
style recovery, layer visibility/overzoom and click deduplication.

## Isolated fixture usage

All assets/tooling live under `utils/test/energyAreas/`, outside application,
public and generated asset trees. Production modules do not import them. Explicit
Node/test installation is required; a production request failure cannot enable them.

`dataset.json` is the canonical JSON and synthetic geometry dataset;
`generate-data.cjs` authors precomputed test summaries from a small frozen synthetic
population. It never imports or executes backend code. `provenance.json` records
SHA-256 of the five authoritative service files inspected on 2026-10-01, plus
pinned encoder/decoder versions. `manifest.json` records exact sample coordinates,
XYZ/TMS rows and the checked-in `.pbf` paths. The generator and responder use
`geojson-vt` and `@maplibre/vt-pbf`; verification independently decodes with
`@mapbox/vector-tile` and `pbf`. These versions are direct dev dependencies.

| Fixture release | Initial role and date |
| --- | --- |
| `11111111-1111-4111-8111-111111111111` | Active, 2026-10-01 |
| `22222222-2222-4222-8222-222222222222` | Retained, 2026-09-01; also usable as a selected candidate/promotion scenario |
| `33333333-3333-4333-8333-333333333333` | Retained, 2026-08-01 |

All three releases remain addressable after pointer changes and have distinct
frozen data/date/tile properties. The fixture has no invented metadata status
field. `setActiveRelease(id)` changes only the test controller's active pointer;
`setActiveRelease(null)` simulates no active release (503).

| Case | Provenance and synthetic extensions |
| --- | --- |
| `00100` whole count 5, `091` intersection 2, `005` intersection 1, `009` zero | `tests/test_area_aggregates.py` and `areas.py`; synthetic lon/lat rectangles deliberately cross two municipalities |
| Leading zeroes, numeric fid, release/cache headers | Native `areas.py` tile SQL/response; fixture numeric IDs deliberately lose leading zeroes |
| Empty `00300`, municipality `009`, region `02` | Canonical `area_contract.empty_metrics()`; geometry still exists |
| Sparse `091` scale map, mixed valid/expired/unknown-validity/unknown-scale, missing/invalid diagnostics | Builder rules; extra synthetic population covers all diagnostic keys and both recognized scales |
| Nonempty `00400` with valid-zero coverage; missing FI/EN names in `00200`, code-only `00300` | Explicit synthetic extensions consistent with optional source names and builder coverage semantics |
| Unknown categories, `no_info` ventilation, unequal area sums/denominators | Builder category/positive-finite sum rules; fixture extensions explicitly exercise unknown category handling |
| Absolute TMS with non-default layers and escapes | Publisher descriptor contract; fixture host/workspace names are synthetic |

Map center `[24.94,60.16]`, postal zoom 11. Postal `00100` crosses municipal
meridian 24.94 and tile columns 1165/1166 at row 592 (TMS row 1455). Region sample
is z6/x36/y18 (TMS45), municipality z8/x145/y74 (TMS181). See the manifest for
all exact paths. Synthetic boundaries/names are not official Finnish data.

`createEnergyAreaFixture({delivery?: 'native'|'xyz'|'tms'})` in `responder.cjs`
exports `fetch`, `respond`, `requests`, `setActiveRelease`, `setDelivery` and
`enqueue`. Native metadata omits scheme; `xyz` advertises it explicitly; `tms`
advertises `https://energy-tiles.fixture.test`, distinct source layers, legal
non-default zoom ranges and query-position placeholders. Configure unit tests
with `resolveEnergyAreaApiConfig({origin:API_ORIGIN})`, then inject `fixture.fetch`.
`API_ORIGIN` is `https://energy-areas.fixture.test`; both origins are test-only.
The responder serves genuine coordinate-correct tiles on demand for valid zooms
0–14, including valid empty bytes outside the small synthetic extent; it does
not replay one tile for unrelated coordinates. TMS requests are mapped to XYZ
only inside fixture generation. JSON status/scope/code/release validation mirrors
the service; known zero intersections return 200 with structured empty metrics.

Deterministic controls consume one matching rule per request:

```js
const gate = createFixtureGate()
fixture.enqueue({ match: url => url.pathname.endsWith('/00100'), gate: gate.promise })
// issue request, change selection/release, then:
gate.release()
fixture.enqueue({ match: () => true, network: true })
fixture.enqueue({ match: () => true, response: {
  status: 503, headers: {}, body: Buffer.from('unavailable'),
}})
fixture.enqueue({ match: () => true,
  transform: payload => ({ ...payload, release_id: anotherRelease }),
})
```

A response is captured before its gate waits. `ignoreAbort:true` deliberately
simulates a noncooperative delayed transport. Rules can supply malformed JSON,
unsupported versions, wrong echoes, tile errors or malformed binary bytes.

For later real-map checks, import `installEnergyAreaFixtureRoutes` from
`playwright.mjs` and install before navigation:

```js
const { fixture, dispose } = await installEnergyAreaFixtureRoutes({ target: page })
// shared responder fulfills JSON and actual Buffer MVT bodies;
// interception only matches explicit fixture origins and area/TMS paths.
// ...navigate, interact, exercise controller scenarios...
await dispose()
```

`target` can also be a Playwright BrowserContext. The installer returns its exact
route cleanup; unrelated origins/paths are never intercepted. If the shared app
needs the public origin set to this test origin, obtain that temporary environment
change and restoration through runtime doctor. Do not start another server or
turn fixtures into an app bootstrap/fallback. Later visual tools use `--no-start`.

Regeneration and checks (run in project root, or inside Compose `app`):

```sh
node utils/test/energyAreas/generate-data.cjs # requires mounted read-only service files for provenance
node utils/test/energyAreas/generate-tiles.mjs
node utils/test/energyAreas/verify.mjs
# Focused Jest paths: common/areas/{config,contract,client,queries}.test.ts
# and layers/areaSource.test.ts under src/applets/energy; plus existing source suites.
yarn start:typecheck
```

`verify.mjs` proves binary polygon rings/geographic placement, all levels/releases,
metadata/detail/tile summaries, adjacent fragments, empty/zero coverage, TMS/source
layers, tile/error/delay routing and binary Playwright fulfillment. Actual map
rendering, interaction and desktop/mobile FI/EN acceptance remain F101.2/F101.3.

## Ordered sibling and live release work

F101.2 consumes this client/query/source factory and owns atomic map/selection
transitions, modes, layers, controls, legends, lifecycle and basic details.
F101.3 extends that shell with metrics/relations/scoped navigation and integrated
acceptance. Neither should add a second client/cache/source factory. No full-area
geometry/bounds endpoint exists; clipped tiles must not be used as complete bounds.
An incompatible prerequisite needs a concrete manager handoff.

Live release prerequisites remain: verify the service origin and API routing,
explicit frontend CORS origins, validated active release, all advertised immutable
source layers/zooms/schemes, a real leading-zero detail and scoped/zero intersection,
retained-release access, then integrated FI/EN desktop/mobile checks. No deployment,
backend ETL/publication or release configuration is authorized by this handoff.
