# Energy area map and latest details

Energy geography follows zoom: region below 7, municipality from 7 to below
10, postal area from 10 to below 12, buildings from 12. There is no geographic
picker or persistent override. Building themes/filters and the aggregate shading
selector remain available. Building filters do not narrow aggregate summaries.

## Independent stable coverage

`PUBLIC_ENERGIAKARTTA_GEOSERVER_URL` configures the GeoServer base (default
`https://sandbox.gis.avoin.org/geoserver`). The frontend registers exactly three
stable vector sources. Metadata and statistics requests never determine their
URLs, names, visibility or selection availability.

| Level | Qualified layer | MVT source layer |
| --- | --- | --- |
| `postal_code` | `sandbox_energiakartta:energymap_postal_code_areas` | `energymap_postal_code_areas` |
| `municipality` | `sandbox_energiakartta:energymap_municipality_areas` | `energymap_municipality_areas` |
| `region` | `sandbox_energiakartta:energymap_region_areas` | `energymap_region_areas` |

The templates use `/gwc/service/tms/1.0.0/<encoded-qualified-layer>@EPSG%3A900913@pbf/{z}/{x}/{y}.pbf`,
`scheme: tms`, zooms 0–14, and `promoteId: area_id`. The API's native XYZ fallback
is not used for map coverage. Stable source IDs are `energymap_areas_<level>`.

Features contain `level`, string `area_code`, `area_id`, FI/SV/EN names,
`building_count`, `valid_official_class_count` and nullable/omitted
`certificate_coverage`. Validate identity as `<level>:<code>` with five/three/two
digit codes. Numeric feature IDs never reconstruct codes. Stable tiles omit
release identifiers. Zero coverage differs from absent/null coverage.

Missing configuration, failed metadata and offline details leave all area
sources and zoom bands intact. There is no generic area-unavailable map banner.
Tile transport failures have their own bounded active-source retry.

## Latest detail service

`PUBLIC_ENERGY_AREA_API_ORIGIN` locates the separate statistics/detail API. The
nonsecret sandbox example is `https://energy-service-test.avoin.org`. This setting
does not enable coverage or choose dataset versions.

Normal requests:

- `GET /energy-data/areas/metadata` (optional diagnostic/provenance metadata).
- `GET /energy-data/areas/{level}/{code}`.
- `GET /energy-data/areas/postal_code/{code}?municipality_code={code}`.

No normal request carries `release_id` or uses operator version routes. Metadata
and details require `latest: true`, `boundary_vintage`, `as_of` and
`metric_version: building-area-summary-v1`. Independently valid detail responses
do not require metadata or matching metadata dates. Metadata and detail service
reads can change at different times and do not represent an atomic snapshot.
Each displayed summary uses its own actual vintage/as-of information.

Detail query keys partition normalized API origin, level, exact string code and
municipality scope (or null). Queries copy and validate inputs, consume abort
signals through body parsing, use no previous-identity placeholder, and suppress
successful statistics after a failed selected-detail request. Missing origin and
request errors are localized inside the clicked panel. Tiles are not substituted
for successful detail statistics.

Details have a 30-second stale lifetime and five-minute cache lifetime; metadata
has a one-minute stale lifetime and the same bounded cache. Detail remounts
refetch, and stale window focus refetches. The provider owns one coordinated
online listener. Refresh and reconnect reload all three owned tile sources with
MapLibre's public `refreshTiles`, cancel pending latest requests (including
same-key first loads), invalidate inactive Back/scope entries and refetch active
queries. This works for map coverage even without detail configuration. There
is no versioned source accumulation or cache-busting query/source ID.

## Selection, navigation and metrics

Shared map `selectedFeatures` owns the active identity. Internal identity-only
navigation placeholders include scope so scope-only changes are observable;
they do not invent tile statistics, geometry, bounds or names.

Region → municipality → postal → buildings uses programmatic zoom, without
pinning a manual level. Municipality → postal requests the precomputed postal
intersection for that municipality while rendering the full postal polygon.
Postal detail retains the full related-municipality crosswalk. Whole-postal
navigation clears scope; Back restores scope/request/zoom. Municipality totals
come from municipality summaries, never sums of whole-postal counts. No supplied
bounds or full-geometry endpoint exists, so navigation preserves the map center.

Refresh, reconnect and compatible style replacement preserve selection and Back.
Style recovery serializes source/group reinstall, then reapplies promoted
selected feature state from the current store, avoiding restoration after a user
close/navigation/zoom change. Ordinary band crossings and applet exit clear
incompatible navigation. Listeners/transports/groups are lifecycle owned.

The v1 panel retains unique counts, official validity and separate 2013/2018
class scales, eligible/known/unknown denominators, source/category distributions,
construction periods, and distinct floor/gross/total/certificate-area sums.
Modeled diagnostics remain separate and model version remains unavailable.
Annual Energy, Cost, CO₂ and Water aggregates are outside this package.

## Verification

Focused Jest tests cover stable descriptors, latest schemas, identity/scope,
abort/race behavior, finite caches, refresh/reconnect, serialized registration,
style selection, navigation and adjacent building behavior. `node
utils/test/energyAreas/verify.mjs` independently decodes recorded real binary
MVT fixtures and verifies stable/latest HTTP routing and isolation.

The synthetic fixture's private snapshot controller models changes between
latest requests. Its private IDs never enter normal requests, tile properties or
product descriptors. Interception covers only the configured detail origin and
the three exact stable GeoServer area paths, preserving other tiles/services.
Offline generation records synthetic authorship and preserves historical backend
hash evidence without accessing or executing backend source.

Actual-map fixture interaction:

```bash
node utils/scripts/visual/energy-area-modes-smoke.mjs --no-start --details \
  --locale=en --viewport=desktop --output=.dev/visual-regression/energy-fixture-en-desktop
```

Unmocked national interaction (normal, blocked metadata, failed details or
browser-local missing-origin configuration):

```bash
node utils/scripts/visual/energy-area-modes-smoke.mjs --no-start --national \
  --scenario=normal --locale=fi --viewport=mobile \
  --output=.dev/visual-regression/energy-national-fi-mobile
```

Run inside the doctor-verified app container on the existing server, with
`--no-start`. Use a distinct output directory for each scenario/locale/viewport.
Runtime diagnosis, setup, service lifecycle and test-environment recovery belong
to `runtime_doctor`; retry after its `RETRY_READY` report. Separate unit/schema,
binary fixture, live HTTP/tile and unmocked rendered-map evidence. Software WebGL
success does not establish physical-device performance.

As of 2026-10-12, live samples are `00100`: 624, `091`: 52,969, `01`: 480,402;
`00370`: 974 globally, 655 within `091`, 319 within `049`. These are verification
samples, never application constants. FI/EN routes are configured today. Swedish
names are retained; Swedish live UI acceptance needs an explicitly authorized
locale configuration/export change before `/sv/energy` can be claimed verified.
