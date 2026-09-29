# Luonnonmetsakartat Mock Browser Runbook

This runbook is for agent-driven Luonnonmetsakartat browser checks against the
already-running app-container dev server. Use `runtime_doctor` for runtime
diagnosis, setup, test-mode configuration, service lifecycle and recovery.
No-start browser commands use the service verified by the doctor.

## Required Mock Env

The dev server must already be running with:

```bash
PUBLIC_COMPILED_APPLETS=main,luonnonmetsakartat
PUBLIC_MOCK_AUTH_ENABLED=1
PUBLIC_MOCK_AUTH_INITIAL_STATE=authenticated
LUONNONMETSAKARTAT_MOCK_API_ENABLED=1
PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED=1
```

Existing production guards reject mock auth/API/scenario flags when
`NODE_ENV=production`.

## Dev-Server Rule

Run browser smoke and visual commands inside the project `app` container so
`http://127.0.0.1:6900` points at the app-container dev server:

```bash
docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec app sh -lc 'cd /app && yarn luonnonmetsakartat:mock:smoke'
```

The smoke script probes `http://127.0.0.1:6900` for reachability but remaps
browser navigation to `http://localhost:6900` for reliable app-container
hydration and clicks. If the runtime is unreachable or its mode is unsuitable,
invoke runtime doctor with the failure and exact verification command (or ask
the manager to delegate). For this feature:

```bash
cd /workspace/codex-orch && PYTHONPATH=/workspace/codex-orch CODEX_ORCH_IN_CONTAINER=1 python3 -m codex_orch run-agent --project /workspace/project/.codex-orch/orch.toml --role runtime_doctor --feature F100.4-luonnonmetsakartat-routing-proxy-tests
```

Poll the same yielded shell session until it exits and its run has `exit.json`.
Read the feature's `runtime-doctor-report.md`, retry the affected command after
`RETRY_READY`, and hand the manager a remaining `RUNTIME_BLOCKED` prerequisite
with the report's evidence. No-start means delegate runtime work; it does not
restrict access to runtime doctor. For later features, use their feature ID.

Jest normally runs from `/workspace/project`. Inside the mock-enabled app
service, doctor verified this process-only environment isolation:

```bash
docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec -T app sh -lc 'cd /app && env -u PUBLIC_MOCK_AUTH_ENABLED -u PUBLIC_MOCK_AUTH_INITIAL_STATE -u PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED -u LUONNONMETSAKARTAT_MOCK_API_ENABLED yarn test:luonnonmetsakartat'
```

This prevents browser mock-auth flags from overriding generic real-auth test
fixtures. It leaves the app service flags unchanged and requires no `.env` edit.

From the Codex agent or host namespace, do not probe `127.0.0.1:6900`; use the
host-published `DEV_PORT` only for manual diagnostics outside this runbook.

## Commands

```bash
yarn luonnonmetsakartat:mock:smoke
yarn visual:luonnonmetsakartat-mocks
node utils/scripts/visual/luonnonmetsakartat-mock-smoke.js --help
```

Both smoke and visual commands are no-start flows and expect the stable dev
server to already exist.

## Main-App URLs

Canonical main-app paths:

- `/fi/luonnonmetsakartat`
- `/fi/luonnonmetsakartat/admin`
- `/fi/luonnonmetsakartat/admin/import`
- `/fi/luonnonmetsakartat/admin/layer/mock-visible-layer`
- `/fi/luonnonmetsakartat/admin/layer/mock-visible-layer/settings`
- `/fi/luonnonmetsakartat/admin/layer/mock-visible-layer/pictures`

Historical paths (unsupported; `legacySubpathRedirects` is empty):

- `/fi/luonnonmetsakartat/admin/tuo`
- `/fi/luonnonmetsakartat/admin/taso/mock-visible-layer`
- `/fi/luonnonmetsakartat/admin/taso/mock-visible-layer/asetukset`
- `/fi/luonnonmetsakartat/admin/taso/mock-visible-layer/kuvat`

## Standalone URLs

Standalone Luonnonmetsakartat builds omit the applet slug:

- `/fi`
- `/fi/admin`
- `/fi/admin/import`
- `/fi/admin/layer/mock-visible-layer`
- `/fi/admin/layer/mock-visible-layer/settings`
- `/fi/admin/layer/mock-visible-layer/pictures`

Historical standalone equivalents (also unsupported):

- `/fi/admin/tuo`
- `/fi/admin/taso/mock-visible-layer`
- `/fi/admin/taso/mock-visible-layer/asetukset`
- `/fi/admin/taso/mock-visible-layer/kuvat`

## F100.4 route expectations for F100.6

The manifest and existing route metadata remain authoritative. `layer-1` is a
unit-test ID; browser work must substitute its discovered ID. The navigation
suite checks its fixtures against actual source route literals/staticData;
the pruning suite promotes those actual files in temporary directories and
checks metadata, parameters, guards and components are preserved.

| `APP_ROUTE_KEYS` suffix after `LUONNONMETSAKARTAT_` | Main | Standalone |
| --- | --- | --- |
| `HOME` | `/fi/luonnonmetsakartat` | `/fi` |
| `ADMIN` | `/fi/luonnonmetsakartat/admin` | `/fi/admin` |
| `ADMIN_IMPORT` | `/fi/luonnonmetsakartat/admin/import` | `/fi/admin/import` |
| `ADMIN_FOLAYER` | `/fi/luonnonmetsakartat/admin/layer/layer-1` | `/fi/admin/layer/layer-1` |
| `ADMIN_FOLAYER_SETTINGS` | `/fi/luonnonmetsakartat/admin/layer/layer-1/settings` | `/fi/admin/layer/layer-1/settings` |
| `ADMIN_FOLAYER_PICTURES` | `/fi/luonnonmetsakartat/admin/layer/layer-1/pictures` | `/fi/admin/layer/layer-1/pictures` |

For every canonical page, missing/unsupported applet locale (`en` or `sv`)
normalizes to `fi`. Standalone removes a duplicated `luonnonmetsakartat` prefix.
The resulting URL passes normalization without another redirect. Redirect tests
preserve `?tab=areas&tab=pictures&q=A%2BB%20C&empty=` byte-for-byte and preserve
the request origin. Href tests prove params/search delegation to TanStack; their
stub router does not verify TanStack's own serialization or page/guard behavior.

For each unsupported tail `T` — exactly `admin/tuo`, `admin/taso/layer-1`,
`admin/taso/layer-1/asetukset`, `admin/taso/layer-1/kuvat` — the following rules
apply with the same search string preserved:

| Input | Main `main,luonnonmetsakartat` | Standalone `luonnonmetsakartat` |
| --- | --- | --- |
| `/fi/luonnonmetsakartat/T` | Pass through | 308 to `/fi/T` |
| `/luonnonmetsakartat/T` | 308 to `/fi/luonnonmetsakartat/T` | 308 to `/fi/T` |
| `/en/luonnonmetsakartat/T` | 308 to `/fi/luonnonmetsakartat/T` | 308 to `/fi/T` |
| `/fi/T` | Pass through as an unknown main-root-shaped path | Pass through |
| `/T` | 308 to `/en/T` | 308 to `/fi/T` |
| `/en/T` | Pass through under a supported main locale | 308 to `/fi/T` |

No rule translates the Finnish tail to an English endpoint. Pass-through is
normalization evidence, not rendered not-found evidence. F100.6 should check
not-found behavior in the available runtime mode. Carbon's retained Finnish
redirects and their ordering remain unchanged.

The configured `luonnonmetsakarta.netlify.app` spelling is intentional test
input, not a typo to fix. Hostname does not choose runtime mode: main `/`
redirects to `/en`, standalone `/` to `/fi`. Main `/fi/admin` does not gain an
applet shortcut. Runtime decisions are 308; Netlify's separately tested adapter
emits `301!` redirects and `200!` rewrites from the unmodified manifest, for both
HTTP and HTTPS:

- Main `/fi/luonnonmetsakartat/*` rewrites to the same canonical target path.
  There are no applet-domain root, `/fi`, or `/fi/admin` shortcut rules.
- Standalone `/fi/luonnonmetsakartat/*` redirects to `/fi/:splat`;
  `/fi/*` rewrites to the target `/fi/:splat`. Root redirects to `/fi`, and
  `/en/*` redirects to `/fi/:splat`.
- `/api/*` preserves its path; `/fi/api/*` targets
  `/api/luonnonmetsakartat/:splat`. API and static rules precede page rules;
  server fallback stays last. Generic matches carry legacy tails unchanged.
- No applet-domain rules are emitted when Luonnonmetsakartat is unselected.

These rule tests prove generated targets/order, not deployed CDN behavior.
Both build modes are deterministic tests with explicit selections; use the
existing doctor-verified main runtime for no-start smoke. Delegate any needed
runtime diagnosis/setup/configuration/recovery to runtime doctor. F100.6 may
exercise live proxy mode only where the existing server permits it; default
transport tests never use a real upstream or credentials.

## Mock Query Params

Use these query params for seeded browser states:

- `mockReset=1`
- `mockLuonnonmetsakartatState=<state>`
- `mockAuth=authenticated`

Common states are `public-layers`, `admin-layers`, `layer-detail`,
`settings-clean`, and `pictures-mapped`.

## Upload Fixtures

Committed shapefile ZIP fixtures:

- `test-data/luonnonmetsakartat/valid-layer.zip`
- `test-data/luonnonmetsakartat/duplicate-id-layer.zip`
- `test-data/luonnonmetsakartat/duplicate-name-municipality-layer.zip`
- `test-data/luonnonmetsakartat/finnish-layer.zip`
- `test-data/luonnonmetsakartat/mojibake-layer.zip`

The [fixture manifest](../test-data/luonnonmetsakartat/README.md) documents
exact rows, deterministic regeneration and encoding limitations. The valid fixture should auto-detect
`id`, `nimi`, `kunta`, `maakunta`, `kuvaus`, and `pinta_ala`. The duplicate
fixture should stay on the import route and trigger duplicate-ID validation
before any create POST.

## Known Limitations

- Imports create deterministic synthetic polygons/IDs/timestamps. ZIP bytes
  are not interpreted or validated by the mock API. Client parser and option
  handoff evidence is covered by F100.3 (I01–I08), separate from these mock contracts.
- Replacement PATCH validates `delete_areas_not_updated` for true/false/omitted
  inputs and can change metadata/columns. Existing areas, geometry, IDs and
  properties remain unchanged with an uninterpreted ZIP in every case. Flag
  acceptance is not preserve-versus-delete reconciliation or real ingestion.
- Pictures are serialized URL/filename metadata only. The mock neither stores
  nor decodes uploaded bytes, fetches picture URLs, nor deletes objects.
  Area PATCH `pictures` replaces the string; `'[]'` removes list metadata.
  There is no separate picture-delete route. Attachment parses malformed or
  non-array stored picture JSON as an empty list and filters non-string list
  entries. URLs are deterministic, not unique object-storage identities.
- The picture smoke uses the `pictures-mapped` in-memory fixture, not an OS
  directory picker. Full visible matching/error behavior belongs to F100.5.
- WFS projects simple centroid points from stored polygons. TMS returns empty
  PBF responses; these do not verify production geometry, rendering, GeoServer
  or PostGIS behavior.
- Server mock storage and counters persist for the process lifetime. Direct
  suites reset before/after each test, compare clean replays and use randomized
  order. The exported test reset helper refuses production; private module
  initialization remains safe for live-mode imports. There is no reset API.
- Browser `mockReset` clears client Zustand/query state, not server memory.
  Existing smoke discovers created IDs but still leaves mutations and tolerates
  console errors. Delegate a required pristine server seed to runtime doctor.
  F100.6 owns complete browser cleanup, repeatability and strict console checks.
- Fixed verified/rejected tokens model HTTP decisions only. Runtime API,
  scenario and auth guards refuse production enablement; that does not validate
  real identity-provider roles or credentials. Default tests use constructed
  Requests and stub transports, without live backend/storage/identity writes.
- Blank optional layer metadata means omitted; explicitly blank optional
  columns can remove options. Area strings retain empty values. `id_col` is
  optional even for mock `id` indexing. These are the implemented mock parsing
  contracts, not claims about production validation. Numeric layer timestamps
  and ISO area timestamps use deterministic counters; composite picture/layer
  PATCH consumes separate mutation steps.

## F100 coverage audit and focused Jest entrypoint

Audit started 2026-09-28 at `01b95e89aaaee417da233e4a06307e50b60a2f63`.
Client transport tests have a different oracle from the server mock lifecycle
and do not replace it. The F100.1 audit found no redundant client suite. F100.2
relocates HTTP/store-only wrapper assertions with the explicit mapping below,
while retaining wrapper/WFS/TMS integration coverage.

The separate local verification plan referenced by the parent was not found in
current project documentation (root README, this runbook, fixture README,
build docs, project context/skills and external-docs path hints). Older feature
history, temporary chats and project-memory archives were not searched. The
ledger retains every explicit parent requirement; unknown plan rows cannot be
claimed audited. Reconcile them if an allowed source is supplied.

**Route correction:** the previously documented Finnish “Legacy redirects” were
stale. The historical path lists above are not positive test expectations.
`appletConf.json` currently has
`legacySubpathRedirects: []`. Do not restore those redirects. The configured
host spelling is `luonnonmetsakarta.netlify.app`. F100.4 protects the route and
transport contracts below; F100.6 owns live available-mode checks and final
runbook reconciliation.

```bash
yarn test:luonnonmetsakartat --listTests --json
yarn test:luonnonmetsakartat
```

`jest.luonnonmetsakartat.config.ts` inherits the existing Jest configuration. It
selects every `*.test.*` / `*.spec.*` JS/JSX/TS/TSX suite below
`src/applets/luonnonmetsakartat/` plus 24 literal shared suites. The allowlist is
intentional: shared auth, map-request authorization, GeoServer config,
routing/build selection, shared API transport and smoke/fixture infrastructure
contain multi-applet assertions and run intact. `src/common/server/apiProxy.test.ts`
is included because the applet live wrapper delegates to that exact helper.
Carbon/Energy applet suites and `__tests__/visual/carbonMockSmoke.test.js` are
excluded. No positional path filters or live credentials are required.

Later children: colocated applet suites are discovered automatically. A suite
outside that tree (such as a shared API proxy or route helper) needs a literal
allowlist entry with a concrete dependency rationale. Rerun `--listTests --json`,
check every literal exists, and compare its paths with a filesystem inventory of
the applet suites plus the allowlist. Do not use `--passWithNoTests` or global
test-name filtering. Listing a suite is not a passing test run.

### Coverage ledger

Paths in the evidence column are relative to `src/applets/luonnonmetsakartat/`
unless marked shared or helper. Existing identifies pre-feature assertions;
passing runs are recorded separately in the last column. Partial means useful
evidence with the listed remaining gap. Pending child rows are not completion
claims. Client evidence uses mocked HTTP with real QueryClient
and applet store; it cannot prove a backend or rendered page contract.

| ID | Required behavior | Current test/case evidence | Level | Status / owner | Limitation or next evidence | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | Anonymous list, normalization, public/admin separation | common/queries/folayerQueries.test.tsx: public layer list / anonymous transport and replaces obsolete records; retains public list on rejection | client | added-and-verified / F100.1 | Anonymous response projection omits admin fields; hidden-layer filtering remains M02 | J-final: pass |
| A02 | Admin list/detail and query keys | common/queries/folayerQueries.test.tsx: admin list/detail / normalizes, defaults, suppresses detail, retains data and recovers | client | added-and-verified / F100.1 | Preserves public/admin timestamp-unit differences; no public detail endpoint | J-final: pass |
| A03 | All protected operations fail closed without token | common/queries/authHeaders.test.ts plus each client suite: token undefined/empty fail-closed cases | client | added-and-verified / F100.1 | Real header helper, zero HTTP calls for every protected consumer; query state remains recoverable | J-final: pass |
| A04 | Verification Pending/NoUser/Verified/Rejected/Errored | common/queries/adminVerificationQuery.test.tsx: settles without HTTP, strict roles, rejected status matrix, unexpected errors, user keys | client | added-and-verified / F100.1 | HTTP state/result/settlement evidence only; rendering/remount loops remain G02/G08 | J-final: pass |
| A05 | Public/admin area URLs and missing config | common/queries/folayerGeoServerQueries.test.tsx: normalized URL, missing config, IDs/picture normalization, suppression and recovery | client | added-and-verified / F100.1 | Public/admin keys and headers differ; both still share area store; logout/UI cleanup remains F100.5 | J-final: pass |
| A06 | Layer create, both indexing strategies and columns | common/queries/adminFolayerPostMutation.test.tsx: creates via each indexing strategy, optional fields, ZIP bytes, 200/201; rejected-status matrix | client | added-and-verified / F100.1 | Multipart transport and response store only; parser/ingestion excluded | J-final: pass |
| A07 | Settings/visibility update | common/queries/adminFolayerPatchMutation.test.tsx: saves settings/inverts visibility, omits absent fields, failures | client | added-and-verified / F100.1 | Server response normalization and notification kinds; rendered settings remain G04 | J-final: pass |
| A08 | Replacement preserve/delete payload | common/queries/adminFolayerPatchMutation.test.tsx: serializes each replacement strategy with true/false/undefined flag | client | added-and-verified / F100.1 | ZIP bytes/name/MIME verified; geometry reconciliation is L02 | J-final: pass |
| A09 | Area edit | common/queries/adminFolayerAreaPatchMutation.test.tsx: own non-null properties, targeted merge, picture removal, failure matrix | client | added-and-verified / F100.1 | Empty strings retained, inherited/null/undefined omitted, geometry untouched; editable API type has no numeric fields | J-final: pass |
| A10 | Aligned picture files/area IDs and invalid pairs | common/queries/adminFolayerPatchMutation.test.tsx: repeated images/IDs aligned; empty/absent arrays; five invalid-pair cases | client | added-and-verified / F100.1 | Order, bytes and repeated IDs verified; UI matching remains G05 | J-final: pass |
| A11 | Delete, callback order, rollback, already absent | common/queries/adminFolayerDeleteMutation.test.tsx: callback awaited, 200/204, resolved/rejected 404, rollback, no token | client | added-and-verified / F100.1 | Axios 404 is idempotent success; other rejections remain errors; UI confirmation remains G07 | J-final: pass |
| A12 | Cache invalidation/refetch and failure isolation | common/queries/adminFolayerPatchMutation.test.tsx: settings/ZIP/pictures cache matrix × neither/public-conf/public-areas; rejected-status cases | client | added-and-verified / F100.1 | Real active observers and public HTTP readback; area refresh callbacks are isolated query fixtures; unrelated keys unaffected | J-final: pass |
| M01 | Reset/seed isolation | server/api/mockDataStore.test.ts: `seeds stable visible, hidden and empty layers`, `creates fresh seed factories`, `clones create and update column inputs`, `replays a mixed lifecycle after reset`; existing client reset/scenario/bootstrap suites retained | store/helper | added-and-verified / F100.2 | Whole nested state, both counters, mutation-result clones and failure replay; client reset does not reset server memory | M-J / M-order pass |
| M02 | Anonymous visible/editor hidden filtering | server/api/mockDataProxy.test.ts: `projects anonymous visible layers and editor hidden/admin metadata, following visibility changes`; retained dataProxy WFS visibility/auth and dispatch cases | HTTP/integration | added-and-verified / F100.2 | Public projection excludes admin fields and embedded areas; detail remains editor-only | M-J pass |
| M03 | Validation states and protected operations | server/api/mockDataProxy.test.ts: `validates %s authorization`, `protected %s / denies %s before parsing or mutation`; store failure matrix | HTTP/store | added-and-verified / F100.2 | Six mutation forms, malformed/unknown credentials, no public fallback; full-state and future ID/timestamp equality | M-J / M-order pass |
| M04 | Mock create/read/update/delete | server/api/mockDataProxy.test.ts: `creates and reads %s columns`, `preserves omitted metadata and columns`, `patches editable area strings`, `deletes layer and area data`; store lifecycle/edit cases | HTTP/store | added-and-verified / F100.2 | Synthetic areas, protected fields, clone boundaries, cleanup and exact 404s; no live ingestion | M-J pass |
| M05 | Mock replacement semantics and limits | server/api/mockDataProxy.test.ts: `preserves seeded areas with an uninterpreted ZIP when delete_areas_not_updated is %s`, `rejects malformed PATCH %s atomically` | HTTP | added-and-verified / F100.2 | True/false/omitted, blank-as-omitted and malformed flags; complete areas unchanged, no geometry reconciliation | M-J pass |
| M06 | Picture update/delete metadata | server/api/mockDataProxy.test.ts: `attaches ordered filename URL metadata, then replaces and removes the picture list without storage operations`, `rejects %s picture batch`; store append/recovery cases; dataProxy WFS removal readback | HTTP/store/integration | added-and-verified / F100.2 | Ordered repeated targets, seed retention, malformed pairs, valid+unknown atomicity; no binary/storage operations | M-J pass |
| M07 | Unsupported routes/methods | server/api/mockDataProxy.test.ts: `returns 405 for $method $path`, deterministic not-found/path matrices, unsupported GeoServer cases, malformed percent encoding and valid encoded counterpart; retained wrapper TMS/WFS errors | HTTP/integration | added-and-verified / F100.2 | Malformed path escape now deterministic JSON 400; no route-policy changes | M-J pass |
| M08 | Production guards for API/scenario/auth | mockDataProxy runtime enablement; dataProxy protected-write/default-env guard; common/mockScenarios/config.test.ts runtime getter; shared src/common/auth/mock.test.ts config/getter and src/runtime/api/userinfo.test.ts endpoint; store production reset refusal | guard/unit | added-and-verified / F100.2 | Truthy matrix, explicit/default env, disabled production branch, no token/config/fetch access on refusal, unchanged store/counters | M-J pass |
| I01 | Valid ZIP parsing and column detection | common/folayerShapefile.test.ts: `parses two real WGS84 polygons`, `detects case-insensitively`; components/FolayerImportShp.test.tsx and FolayerUpdateShp.test.tsx: detected/manual columns | parser/UI | added-and-verified / F100.3 | First-feature columns; homogeneous multi-collection merge only. Existing two smoke-helper parser cases retained. | I-J / I-focused pass |
| I02 | Missing shapefile parts and malformed ZIP | common/folayerShapefile.test.ts: `rejects %s safely`, `missing DBF`, `tolerates missing %s`, empty collection; both controls: failure/recovery; both pages: no mutation on parse failure | parser/UI | added-and-verified / F100.3 | SHP required by parser; DBF omission blocks selectors; SHX/PRJ/CPG tolerated for these fixtures, not arbitrary projections/encodings. | I-J / I-focused pass |
| I03 | Duplicate ID | common/folayerShapefile.test.ts: numeric/string/zero/prototype IDs; both controls: duplicate-ID rejection; import page `does not create from %s`; settings `never patches hard invalid %s` | parser/UI | added-and-verified / F100.3 | Hard duplicates precede warnings. Browser now observes visible notification and zero create requests, without a console-error success signal. | I-J / I-focused / I-browser pass |
| I04 | Duplicate name + municipality | common/folayerShapefile.test.ts: real duplicate-pair fixture and tuple-label collision; both controls and both page suites block the pair before mutation | parser/UI | added-and-verified / F100.3 | Unique IDs isolate pair duplication; strategy contrast covered. F100.6 consumes duplicate-name-municipality-layer.zip for browser coverage. | I-J / I-focused pass |
| I05 | Blank/invalid identifiers and strings | common/folayerShapefile.test.ts: `does not invent an ID format rule`, `characterizes permissive string value handling`, required columns, deduplication and unsupported alphabet; control clearing/ref guards | policy/UI | added-and-verified / F100.3 | Present-column blank/null/non-string values remain permissive; IDs stringify, zero counts, null skips, no trimming/case folding. These are frontend limits, not backend acceptance. | I-J / I-focused pass |
| I06 | Encoding failures | common/folayerShapefile.test.ts: real UTF-8 Finnish/mojibake and invalid-byte variant; both control suites: real dialog confirm/cancel; replacement page: cancellation sends nothing | parser/UI | added-and-verified / F100.3 | Pair identity errors block; ID name/municipality/region errors warn. Literal Ã and unsupported characters are heuristic, not comprehensive encoding detection. | I-J / I-focused pass |
| I07 | Both indexing modes and optional columns | common/folayerShapefile.test.ts: detection/saved mapping/optional values; both controls: selection/clearing and locked replacement strategy; import page exact payload | parser/UI | added-and-verified / F100.3 | Required mappings must exist. Optional missing mappings are cleared/detected; descriptions/areas are not value-validated. A06/A08 retain HTTP serialization ownership. | I-J / I-focused pass |
| I08 | Replacement preserve/delete choice and handoff | pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.replacement.test.tsx: both strategies, default false/toggle true/back false, exact bytes, confirmation/cancellation, reset, no-file save and FileReader races; components/FolayerShapefile.races.test.tsx | UI | added-and-verified / F100.3 | No fallback to unvalidated bytes. M05 remains mock semantics; L02 remains live geometry reconciliation; G04 remains general settings behavior. | I-J / I-focused pass |
| R01 | Canonical main/standalone/locale contracts | shared src/common/routing/{publicRoutes,requestRouting,appletSelectionContract,routeMetadata}.test.ts; src/common/navigation/appRouteLinks.test.tsx: six source-bound route keys in both modes; utils/scripts/{appletBuildConfig,prebuildFolderPrune}.test.js: actual source promotion/main retention | unit/build | added-and-verified / F100.4 | Stub href router proves delegation; no standalone running-build or page rendering claim | R-family / R-shared: pass |
| R02 | Configured host and removed legacy paths | shared requestRouting.test.ts: configured host and all four unsupported tails in both modes; publicRoutes.test.ts: empty aliases/no translation; utils/scripts/writeNetlifyRedirects.test.js: literal manifest hostname, protocols, ordering, unselected omission | unit/build | added-and-verified / F100.4 | Generic locale/prefix normalization preserves legacy tails; deployed CDN and rendered not-found remain F100.6/live | R-family / R-shared: pass |
| R03 | GET/POST/PUT/PATCH/DELETE forwarding | server/api/dataProxy.test.ts: all five live methods through real helper; dataProxy.route.test.ts: exact Start route, five wrapper identities and stubbed round-trip | transport | added-and-verified / F100.4 | Constructed HTTP objects and injected upstream only | R-family / R-shared: pass |
| R04 | Query/header/body/status forwarding | shared src/common/server/apiProxy.test.ts: encoded/repeated/empty query, base path, header allowlists, multipart/binary/JSON bytes, DELETE with/without body, GET/HEAD, null 204/205/304, empty 200, HTTP error propagation | transport | added-and-verified / F100.4 | Stream failures after returning a response and real backend behavior remain outside this catch boundary | R-family / R-shared: pass |
| R05 | Missing backend config and secret-safe failures | shared src/common/server/apiProxy.test.ts: absent/blank config, missing tail, fetch/setup/body-read failures, exact safe logger args/full local response; Carbon dataProxy.test.ts: TypeError/Error regressions | transport | fixed-and-verified / F100.4 | Fixed logging event only; upstream HTTP bodies intentionally propagate unchanged | R-family / R-shared: pass |
| G01 | Public loading/layers/empty/dependency error | pages/LuonnonmetsakartatHomePage.test.tsx: `loads anonymous rows`, `shows an empty success`, `renders failed list feedback`, `renders area dependency failure`, `keeps a usable row with missing GeoServer config`, `retains public rows on failed refresh` | rendered/integration | added-and-verified / F100.5.1 | Real page/row/hook/query/store; controlled map operations and HTTP. Missing GeoServer config safely leaves an empty map style with no error banner; no live map claim. | G-family / G-order / G-browser pass |
| G02 | Unauthenticated/pending/missing-token/rejected/error/verified gate | pages/admin/LuonnonmetsakartatAdminGate.test.tsx: `closes incomplete auth`, `waits for verification`, `waits for token resolution`, `never renders a previously verified child`, `rejects an absent user identity`; LuonnonmetsakartatAdminAccess.test.tsx: `closes actual detail settings/pictures links` | rendered/integration | added-and-verified / F100.5.1 | Real auth context, gate, verification query, QueryClient, store and admin pages; auth provider input/HTTP controlled. Transient child layout effects are checked. No live identity-provider claim. | G-family / G-order pass |
| G03 | Admin empty/list/detail | pages/admin/LuonnonmetsakartatAdminPage.test.tsx: `loads verified admin records`; pages/admin/layer/folayer/LuonnonmetsakartatAdminLayerFolayerPage.test.tsx: `loads the actual detail`, `loads the new route ID`, `settles map initialization`, `shows a bounded area-dependency error`, `finishes list area preload across actual detail navigation`, `settles a populated list refresh after list → detail → list → detail navigation under the same gate` | rendered/integration | added-and-verified / F100.5.1 | Actual rows, runtime and SearchTable; upload/toggle/detail/settings/pictures navigation. Thin navigation adapter uses real href resolver and switches list/detail children under the same gate. Deferred area preloads and populated list refreshes finish after navigation, with Idle store/query state and usable detail links. No settings/picture edits or real geometry assertions. | G-family / G-order / G-visual / G-refresh pass |
| G04 | Settings clean/dirty/saving/error | pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.test.tsx: clean controls, real keyboard color/visibility edits, debounced/immediate name saves, pending guards, server result, failure/retry, timer/loader cleanup and seeded Saving compatibility | rendered/integration | fixed-and-verified / F100.5.2 | Real page, patch hook, QueryClient, stores and notifications; controlled HTTP. Retains replacement suite. No live persistence claim. | S-focused / S-family / S-order / S-live / S-visual pass |
| G05 | Pictures empty/matched/unmatched/save/error | common/mockScenarios/scenarios.test.ts: picture variants | seed | pending F100.5 | Mapping interactions; transport is A10 | Existing suites pass J-baseline / J-final; stated gap pending |
| G06 | Area edit UI | Existing smoke lacks full lifecycle edit | UI | pending F100.5 | Accessible controls and save/error | Pending child; no run claim |
| G07 | Destructive confirmation | pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.test.tsx: keyboard delete, real cancel/reopen/confirm, selected second-layer request, pending Save guard, deferred real map cleanup/navigation, failure with unsaved name/visibility and retry | rendered/integration | fixed-and-verified / F100.5.2 | Real dialog/delete hook/applet/UI stores/group ID and map bookkeeping with null WebGL instance. Preserves unrelated records, areas, groups and subscriptions. No GPU/upstream cleanup claim. | S-focused / S-family / S-order / S-live pass |
| G08 | No retry/remount loops or editing exposure on rejection | pages/admin/LuonnonmetsakartatAdminGate.test.tsx: `settles denial/error`, `ignores obsolete validation`, `ignores an obsolete success after logout`, `bounds StrictMode`, `does not trust stale store verification`, `redirects a rejected nested page`; LuonnonmetsakartatAdminAccess.test.tsx: `revokes private rows`, `does not restore privileged data`, `discards queued %s after revocation`, `discards an admin installation already resolving its style`; LuonnonmetsakartatAdminLayerFolayerPage.test.tsx: `settles a populated list refresh` | rendered/integration | fixed-and-verified / F100.5.1 | Real verification, no seeded status or mocked hook. One deliberate verification per ordinary mount; same-gate return navigation adds no verification or list loop; StrictMode attempts are bounded. Applet-scoped revocation cancels query work/removes privileged data and popup ownership; queued additions recheck hook ownership at execution and after style resolution, with no transient installation. Browser lifecycle expansion remains F100.6. | G-family / G-order / G-refresh pass |
| B01 | Public visible/hidden and auth gates | Existing smoke visits seeded routes | browser | partial / F100.6 | Anonymous hidden exclusion and logged-out/rejected/verified assertions | Current smoke passes (B-runtime-retry); remaining gap pending |
| B02 | Valid import and both duplicate-key rejections before POST | Existing smoke imports valid ZIP and rejects duplicate ID | browser | partial / F100.6 | Duplicate pair and complete lifecycle | Current smoke passes (B-runtime-retry); remaining gap pending |
| B03 | Admin detail/settings/pictures navigation | Existing smoke visits those routes | browser | partial / F100.6 | One created-layer navigation flow | Current smoke passes (B-runtime-retry); remaining gap pending |
| B04 | Name/color/visibility save with public readback | Existing smoke saves settings | browser | partial / F100.6 | Subsequent public visibility readback | Current smoke passes (B-runtime-retry); remaining gap pending |
| B05 | Area metadata save/readback | No full smoke lifecycle | browser | pending F100.6 | One area edit/readback | Current smoke does not cover this row; pending child |
| B06 | Pictures matched/unmatched/save/readback | Existing smoke saves seeded mapped pictures | browser | partial / F100.6 | Actual readback and unmatched behavior | Current smoke passes (B-runtime-retry); remaining gap pending |
| B07 | Delete/absence and cleanup after failure | Existing smoke closes browser resources only | browser | pending F100.6 | Run-specific names, discovered IDs, finally cleanup | Current smoke does not cover this row; pending child |
| B08 | Canonical/applicable legacy and runtime modes | helper smoke URL tests; shared route tests | helper | partial / F100.6 | Live available mode; removed legacy paths stay unsupported | Current main-mode canonical smoke passes; remaining gap pending |
| B09 | Repeatability and strict page/console errors | helper no-start reachability tests; current smoke tolerates console errors | helper/browser | partial / F100.6 | Strict applet errors, precise third-party allowances, repeated run | Current smoke passes with one documented non-fatal console error; remaining gap pending |
| L01 | Real GeoServer/PostGIS ingestion | None in default tests | live | separate live/manual | Opt-in disposable IDs and cleanup | Excluded from defaults |
| L02 | Real replacement reconciliation/deletion | Mock intentionally preserves geometry | live | separate live/manual | Opt-in real backend acceptance | Excluded from defaults |
| L03 | Real object storage and identity provider | Shared tests stub identity transport; mock pictures use deterministic URLs | live | separate live/manual | No live credentials or shared-sandbox writes in defaults | Excluded from defaults |
| H01 | Layer/style/config and map-request auth regressions | common/{constants,geoServer,utils}.test.ts; layers/forestUseDeclarations.test.ts; shared publicGeoServer.test.ts and src/components/Map/mapAuthTransformRequest.test.ts | unit | existing / F100.1 | Applet `common/utils.ts` marks admin vector sources `useAccessToken`, the map store embeds that request metadata, and `MapHandler` installs this transform; the shared suite proves bearer attachment, missing-token stale-source handling, public requests, and configured GeoServer matching | J-baseline / J-final pass for original evidence; J-review-final includes map auth |
| H02 | Fixture/scenario/bootstrap safety | common/mockScenarios/LuonnonmetsakartatMockScenarioBootstrap.test.tsx; shared registry, route guards, visual scenarios/impactMap | helper | existing / F100.1 | Helper lifecycle/production guards are not page rendering | Existing suites pass J-baseline / J-final; stated gap pending |
| H03 | Focused command, checks, runbook | Initial 39-suite inventory plus current 40-suite reviewer-pass inventory; execution evidence below | verification | added-and-verified / F100.1 | Final family reconciliation F100.6 | J-review-discovery, J-review-final, T, L and B-runtime-retry pass |

### F100.5.2 settings/deletion evidence

G04/G07 use the actual settings page with the existing `pages/pageTestSupport.tsx`
providers, real patch/delete option hooks (only retries disabled in tests), real
`NotificationProvider` and `ConfirmationDialog`, and real sidebar-loader ownership.
Network outcomes are deferred Axios responses; unexpected network and console
errors remain guarded. Each expected mutation error is checked exactly before
being consumed. Name tests advance fake timers inside `act`; clients, stores,
portals, pending work, map instance/subscriptions, storage and timers are isolated.
The deletion wrapper delays completion, then calls the real `removeLayerGroup`
without WebGL. It proves selected group/subscription/joined-source cleanup and
navigation ordering, plus preservation of unrelated records and area data.

Regressions reproduced sending the previous name on immediate Save, discarding
an edit accepted during a pending save, enabled Save during deletion, and a
sidebar loader left active after delete rejection. The local page correction
flushes debounced names and reads the latest selected record, invalidates stale
work on route change, disables the existing form during operations, and derives
loading from both pending mutations. Delete confirmation also flushes the name
so request failure restores the current unsaved draft. Existing replacement
validation, warning confirmation, file-version checks and success-only reset
remain covered by the unchanged F100.3 suite. No translation or shared-control
change was needed.

Verification on 2026-09-29; logs/artifacts are ignored under
`.tmp/F100.5.2-coder/`. Exact expanded commands are in this feature's coder report.

| Reference | Command/check | Observed result |
| --- | --- | --- |
| S-discovery | `yarn test:luonnonmetsakartat --listTests --json` | Exit 0; 56 → 57 suites. Only the new settings suite was added; replacement and the same 24 allowlisted suites outside the applet remain. |
| S-focused | `yarn test:luonnonmetsakartat --runTestsByPath` with new settings, replacement, patch and delete suites | Exit 0; 4 suites / 76 tests / 0 snapshots (12 new page cases). Baseline retained suites: 3 / 64, exit 0. |
| S-family | `yarn test:luonnonmetsakartat` | Exit 0; 57 suites / 1,074 tests / 0 snapshots. An earlier concurrent verification run timed out one existing import test at 5 s; rerunning after the heavier checks finished passed without changing that test or timeout. |
| S-order | New settings + replacement + admin list/detail suites, `--randomize --seed=10052 --runTestsByPath` | Exit 0; 4 suites / 34 tests / 0 snapshots. |
| S-shared | Auth client, appRouteLinks, TextFieldWithLabel, ColorPickerWithPopover, SquishedSwitchWithLabel, IconWithText and Button suites | Exit 0; 7 suites / 90 tests / 0 snapshots. |
| S-types | `yarn start:typecheck`; `yarn exec tsc --project .tmp/F100.5.2-coder/tsconfig.tests.json --noEmit` | Both exit 0. The ignored config explicitly includes the new test, Jest/jest-dom types and ambient/generated route declarations. |
| S-lint | Explicit ESLint on both changed TSX files; `yarn lint`; `git diff --check` | All exit 0. Changed files: 0 warnings; full lint: 0 errors / 296 pre-existing warnings, matching the preceding ledger result. |
| S-runtime | Runtime doctor run `20260929-094146-919737-runtime_doctor-F100.5.2-luonnonmetsakartat-settings-deletion-tests` | Exit 0 and `exit.json` checked; `RETRY_READY`, no repair/restart. Main + applet mock-auth/API/scenarios enabled. |
| S-smoke | App container: `yarn luonnonmetsakartat:mock:smoke` | Exit 0; all eight existing steps, `ok: true`, `xvfb-webgl`; no reported console errors. Existing mock smoke, not the future browser lifecycle matrix. |
| S-visual | App container: `yarn visual:baseline -- --no-start --scenario-set luonnonmetsakartat-mocks`, then `yarn visual:changed -- --no-start --scenario-set luonnonmetsakartat-mocks --files src/applets/luonnonmetsakartat/pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.tsx` | Both final commands exit 0; the runner selects all 15 scenarios / 30 desktop/mobile captures, including clean/unsynced/saving. First comparison caught an unnecessary seeded Saving overlay change; corrected before the final 30/30 pass. Reports: `visual-before.json`, `visual-after-first.json`, `visual-after.json`; standard images under `.dev/visual-regression/`. |
| S-live | App container: `xvfb-run -a node .tmp/F100.5.2-coder/live-settings.cjs` | Exit 0, desktop/mobile: real pending controls disabled, current name submitted once, distinct fulfilled server result rendered, Delete cancellation leaves editing usable and sends no DELETE. No page/console errors. `live-settings.json`, `pending-{desktop,mobile}.png`, `recovered-{desktop,mobile}.png`. |

The live check uses local mock scenarios and an intercepted PATCH, and does not
write to live services. Baseline screenshots protect layout; Jest supplies the
failure/retry and map-cleanup evidence. G05/G06 remain F100.5.3; B05–B09 and final
runbook reconciliation remain F100.6. Public-cache synchronization, remote
geometry/object storage, actual GPU resource deletion and map-cleanup callback
failure after successful remote deletion are not newly claimed here.

### F100.5.1 auth/read-page evidence and A05 handoff

A05's deferred access-cleanup work is covered by
`pages/admin/LuonnonmetsakartatAdminAccess.test.tsx`: `revokes private rows,
areas, selection and external popup before entering the public page` and
`does not restore privileged data or map groups from late %s reads`,
`discards queued %s after revocation and public navigation` (list preload and
detail enable), and `discards an admin installation already resolving its
style when access is revoked`. The queue cases restore the real addLayerGroup,
function queue executor and style installer, with a null WebGL instance. They
observe store publications as well as terminal state: no transient admin group,
subscription or popup survives revocation; unrelated queued work and anonymous
layer installation still succeed. Verification and admin reads populate the actual store before logout; the
same layer then receives a distinct anonymous area response without resetting
test state. Hidden records, admin selections, popup ownership and late
list/detail/area results cannot cross that transition. Unrelated selected
features, queries, map groups and public metadata survive. A05's original
URL/normalization matrix remains unchanged.

The five new suites use `pages/pageTestSupport.tsx`, not the query or shapefile
helpers with broader mocks. Real AuthSessionContext/useAuthSession,
QueryClient, applet/UI/map stores, page components, rows, applet hooks,
useLayerGroup/useExclusiveLayerGroups, loading/messages and SearchTable are
retained. HTTP and WebGL operations are controlled; the navigation adapter
materializes route-key/parameter hrefs through the production resolver.
Sidebar chrome and popup editor contents are bounded adapters; the actual
MapPopupHandler proves popup ownership/removal, not area editing.
Unexpected HTTP/fetch and console errors fail tests. Teardown unmounts portals,
cancels/clears clients and restores stores, environment, title, storage,
spies, timers and real map-to-applet subscriptions. No scenario query flags or seeded verification status are
used as authorization evidence.

The gate now checks its current session/token attempt before rendering a
protected child. Revocation clears applet admin queries/data, selections and
popups; aborted/obsolete results cannot publish store changes. One ordinary
mounted gate deliberately validates once, including a same-client remount;
terminal status updates and unrelated rerenders do not retry. A fresh-client
mount also validates even when real earlier verification left a stale global
status. Raw bearer tokens remain outside cache keys and applet state. Detail
runtime instances are keyed by route layer ID and restore the prior title on
unmount; useful metadata/navigation does not wait for map visibility.

Admin area preloads and list refreshes deliberately do not consume React
Query's observer abort signal: list-to-detail navigation may remove every
observer. The same request completes for the new page instead of leaving an
area placeholder or existing layer metadata in Fetching. Access revocation still explicitly cancels/removes the query and
increments the access generation; a late HTTP response cannot repopulate the
store. The transport can finish after revocation, but its result is discarded.
The actual link-driven list/detail regression verifies the rendered area,
Idle state, one request and settled query after navigation. The additional
`settles a populated list refresh after list → detail → list → detail navigation
under the same gate` regression holds the second list response while opening
an existing layer again. It failed with Fetching before the fix; now metadata
and the query settle, the heading/areas/settings/pictures links render, and
rerenders leave exactly two list reads and one verification. The access
generation stays unchanged across that navigation; logout/rejection/late-result
regressions continue to verify the separate revocation boundary.

Evidence on 2026-09-28 (full command paths/logs in the feature coder report):

| Reference | Check | Observed result |
| --- | --- | --- |
| G-baseline | `yarn test:luonnonmetsakartat --listTests --json`; `yarn test:luonnonmetsakartat` before edits | Exit 0; 51 suites / 1,012 tests. Existing query/scenario/bootstrap/fixture support audited. |
| G-discovery | Same discovery command after implementation; independent filesystem + literal allowlist comparison | Exit 0; 56 suites = 32 applet + unchanged 24 shared. Exactly five new page suites; no lost, missing or unexpected suite. |
| G-family | `yarn test:luonnonmetsakartat` | Exit 0; 56 suites / 1,062 tests / zero snapshots. |
| G-order | Five new page suites with `--runTestsByPath ... --randomize --seed=10051 --showSeed` | Exit 0; 5 suites / 50 tests. Includes bounded retry clocks, StrictMode, fresh/same-client remounts and stale responses. |
| G-shared | Base Jest with the eight planned shared auth/navigation/control paths plus geoserverJsonQuery and MapLayerButton/LayerMenuContent | Exit 0; 10 suites / 154 tests. |
| G-types | `yarn start:typecheck`; `yarn exec tsc --project .codex-orch/features/F100.5.1-luonnonmetsakartat-auth-read-page-tests/coder-f1-artifacts/tsconfig.tests.json --noEmit` | Exit 0 for app and additional explicit page/helper/changed-query-test compilation. |
| G-lint | Explicit changed-file `yarn exec eslint`; `yarn lint`; `git diff --check` | Exit 0; no new warnings. The two newly touched shared map files carry 35 existing warnings (HEAD comparison confirmed identical rule/message lists); full lint retains 0 errors / 296 warnings. |
| G-runtime | Requested synchronous runtime-doctor command | Exit 0; run `20260928-195434-375431-runtime_doctor-F100.5.1-luonnonmetsakartat-auth-read-page-tests`, `exit.json` checked, `RETRY_READY`. No runtime repair/restart/config change. |
| G-browser | Independent app-container `yarn luonnonmetsakartat:mock:smoke` retry, existing no-start script | Exit 0; all eight steps pass, `xvfb-webgl`, preflight 127.0.0.1:6900 and browser localhost:6900. No reported console error. |
| G-visual | App-container `yarn visual:baseline -- --no-start --scenario-set luonnonmetsakartat-mocks` before production edits; `yarn visual:luonnonmetsakartat-mocks --files=<gate,home,detail-runtime>` after | Exit 0; all 15 existing full-page scenarios / 30 desktop/mobile captures pass. Existing full-page fixtures cover these page changes; no new fixture registry/framework. |
| G-error-visual | Ignored `.tmp/f10051/public-error-browser.cjs --no-start` using existing browserRuntime/context helpers and intercepted 503 list replies | Exit 0; desktop 1440×900 and mobile 390×844 each show the existing translated layer-fetch error after exactly four requests; no page errors. Screenshots inspected. |
| G-refresh | Review F1 permanent populated-list navigation case, then detail/access/query suites | Before fix: exit 1, expected Idle but received Fetching. After fix: exit 0, 3 suites / 46 tests. No copied pages or mocked verification; existing late-list/detail/area revocation cases retained. |
| G-refresh-browser | Ignored `.dev/f10051-f1/list-refresh-browser.cjs --no-start`, desktop/mobile, existing mock runtime | Exit 0; actual return navigation revalidates and changes access generation (11 → 15 → 19), so it clears existing records. Releasing held reads restores detail/areas/editing links without page/console errors. This is browser navigation evidence only; G-refresh supplies the exact same-gate delayed-refresh proof. |
| G-review-regressions | Both original reviewer Jest reproductions, plus four permanent queue/style/list-detail cases in the existing suites | Reviewer reproductions fail before / pass after. New queue and list/detail regressions fail before / pass after; queued work cannot install even transiently, anonymous/unrelated work still installs. |
| G-live-revision | Ignored `.dev/visual-regression/f10051-coder-revision/{queued-admin,list-detail}-browser.cjs --no-start` in the doctor-verified app container | Exit 0; real delayed IndexedDB hydration → verified detail → logout → public navigation leaves no admin group/layer/rendered feature; slow WFS list → detail and reload render areas. Actual settings/pictures destinations render their clean controls. No page errors or scenario-seeded verification. |

The F1 revision reran discovery/family, randomized pages, shared checks, types,
lint, smoke and all 30 existing visual comparisons. Exact logs and the
before/after navigation regression are in the feature
`coder-f1-artifacts/` folder; existing visual baselines were retained. Its live
probe records the runtime's generation changes explicitly and does not claim
they exercise the same-gate regression.

The screenshot comparisons protect existing page layout and scenario-preview
compatibility; they do not prove authorization. The query-driven component
tests provide that evidence. The additional public-error browser check uses
controlled HTTP and is not a new standard lifecycle runner. Missing GeoServer
configuration is safe but cannot display a working map. The revision probes
exercise actual WebGL installation with the mock API, not real GeoServer/PostGIS,
identity or object-storage behavior. Settings and pictures Save buttons are
intentionally absent in clean states; destination checks assert the name input
and picture-folder control, without changing or saving data. Live services remain
separate integration checks. G04–G07 remain with F100.5.2/F100.5.3; browser lifecycle and final
runbook reconciliation remain F100.6. Preserve the doctor's verified service:
the live mock flags differ from checked-out `.env`; delegate any recreation or
recovery to runtime_doctor rather than restarting from the disabled file values.

### F100.1 execution evidence

The audit was recorded before new behavioral tests. Evidence on 2026-09-28:

| Reference | Command/check | Observed result |
| --- | --- | --- |
| J-baseline | `yarn test:luonnonmetsakartat` before new tests | Exit 0; 32 suites, 458 tests; 11.299 s. |
| J-discovery | `yarn test:luonnonmetsakartat --listTests --json` | Exit 0; baseline 10 applet + 22 shared; final 17 applet + exactly the same 22 shared = 39. Independent filesystem comparison matched; every literal exists; no unrelated applet/smoke suites. |
| J-final | `yarn test:luonnonmetsakartat` | Exit 0 twice after implementation: 39 suites, 606 tests, zero snapshots (10.260 s and final 11.841 s). Includes all 22 shared contracts; none of their primitives changed, so no redundant separate shared run. |
| J-review-discovery | `yarn test:luonnonmetsakartat --listTests --json` after reviewer correction | Exit 0; 17 applet + 23 shared = 40 paths. Independent filesystem/allowlist comparison matched with no missing or unexpected paths; no Carbon/Energy applet suites or Carbon smoke selected. |
| J-review-final | `yarn test:luonnonmetsakartat` after reviewer correction | Exit 0; 40 suites, 615 tests, zero snapshots; 12.227 s. Includes the newly selected nine-test shared map-auth transform suite. |
| T | `yarn start:typecheck` | Exit 0 initially and again after the reviewer correction. Excludes test files. An additional temporary config including all query tests, the test helper and existing declaration shims also passed `yarn exec tsc --project .tmp/f100-1-coder-20260928/tsconfig.tests.json --noEmit`. |
| L | Changed-file `yarn exec eslint` (explicit paths in coder report); `yarn lint` | Changed files: exit 0, no warnings; the reviewer-pass config lint also exited 0. Full lint exited 0 again after the correction with 0 errors and 309 existing warnings, all outside changed files. |
| B-runtime | App-container smoke command above | Exit 1: `service "app" is not running`. Compose `ps app` returned no service. Shared `.env` has `DEV_PORT=6900` and mock auth/API/scenario flags all `0`; no flags changed and no smoke mutations attempted. |
| B-runtime-retry | Runtime doctor, then the same app-container smoke command | Runtime-doctor run `20260928-141538-897850-runtime_doctor-F100.1-luonnonmetsakartat-api-contract-tests` exited 0 with `RETRY_READY` and made no runtime change because the existing feature-local mock runtime was healthy. The coder retry exited 0: all eight steps passed using `xvfb-webgl`; one documented non-fatal browser console error was observed. |

The eight client suites contain 154 cases (including the six preserved WFS
URL/configuration cases); the full command adds 148 net cases to the baseline.
The WFS suite now uses the actual applet store/header helper, retaining its
original behavioral assertions instead of keeping redundant mocked-helper calls.
The local helper uses existing Testing Library/Jest, real QueryClient, real
Zustand actions (through the repository's normal reset wrapper), and realistic
Axios errors. It fails unexpected HTTP calls, restores state/mocks/env, and clears
clients/unsubscribes observers. No external service calls or credentials are
needed. The tiny in-memory ZIP bytes prove transport, not archive validity.

Regressions were reproduced before fixes:

- Admin list/detail and public/admin WFS left records `Fetching` after rejected
  reads; missing admin tokens also changed state, and an omitted admin-list
  record stayed busy after success. The initial read run failed 28 of 78 cases.
  Early token checks and conditional `finally` state cleanup preserve data and
  permit retry. The corrected 78-case run passed.
- Five invalid picture-pair shapes silently dropped uploads and reported
  success; Axios-rejected DELETE 404 failed despite existing resolved-404
  acceptance; missing-token delete briefly entered `Deleting`. The initial
  mutation run failed 8 of 76 cases. Length validation now rejects before HTTP,
  delete checks auth before state work, and only Axios 404 is treated as already
  absent. The corrected 76-case run passed.

No rendered component changed, so visual screenshots were not required. Browser
verification is available on the doctor-verified mock runtime: the exact
no-start smoke passed after `RETRY_READY`. The runtime-doctor pass and this coder
retry made no server lifecycle or environment change. The earlier stopped-service
failure remains recorded as B-runtime historical evidence. The passing current
smoke covers import/duplicate-ID/settings/seeded-picture behavior, not F100.6's
complete cleanup/readback lifecycle and not real GeoServer, PostGIS, storage or
identity-provider acceptance.

The existing `FolayerFeatureProperties` type intersects numeric and string
`created_ts`/`updated_ts` declarations. The local typed fixture documents a narrow
boundary cast for realistic API timestamps; this feature does not migrate that
public type or timestamp units. No packages, lockfiles, env definitions,
translations, route policy or retry policy were changed.

### F100.2 assertion relocation audit

Audit made against `5c37d17ba811a01b3871047a452534426b70e405` before removing
wrapper assertions. Direct replacements passed first (196 cases). The original
27-case `server/api/dataProxy.test.ts` mixed HTTP/store contracts with wrapper
integration. The following mapping accounts for each removed case and its unique
assertions. `HTTP` means `server/api/mockDataProxy.test.ts`; `store` means
`server/api/mockDataStore.test.ts`. Names below identify the actual test cases
or parameterized case prefixes.

| Original `dataProxy.test.ts` case | Assertions retained in direct replacement |
| --- | --- |
| `does not fall back to public layers for rejected or unknown auth` | HTTP `validates %s authorization and never downgrades an authenticated list request`: 401/403 and exact denial/role bodies; adds empty, non-bearer and malformed credentials. |
| `validates verified, rejected, missing, and unknown mock admin auth` | Same HTTP matrix: validate 200 and both roles true; rejected 403, missing/unknown 401 and both roles false. |
| `serves admin layer detail and deterministic layer id errors` | HTTP `projects anonymous visible layers and editor hidden/admin metadata, following visibility changes` compares detail to admin list; `returns deterministic %s %s errors without mutation` asserts missing ID 400 and unknown ID 404 with exact JSON. |
| `requires verified admin auth for mock layer mutations without changing state` | HTTP `protected %s / denies %s before parsing or mutation with status %s and unchanged counters`: all six protected mutation forms, denial bodies, whole-state equality and clean replay of future ID/timestamps. |
| `creates deterministic mock layers from multipart import fields and resets them` | HTTP `creates and reads %s columns with synthetic areas, without interpreting or requiring ZIP bytes`: 201, exact trimmed admin DTO/columns/default description, list/detail readback and synthetic IDs; store `creates deterministic synthetic areas, preserves omitted metadata, and deletes without reusing IDs` retains exact layer/area timestamps and area names; store `replays a mixed lifecycle after reset, restoring deleted seed data and both counters` proves repeatability. |
| `patches layer metadata and preserves areas when a raw update zip is present` | HTTP `preserves seeded areas with an uninterpreted ZIP when delete_areas_not_updated is %s`: exact metadata, all columns, original creation timestamp, mutation timestamp and unchanged whole area collection for true/false/omitted flags; malformed flag atomicity is separate. |
| `attaches deterministic picture URLs to mock areas from bulk image fields` | HTTP `attaches ordered filename URL metadata, then replaces and removes the picture list without storage operations`: encoded URLs, attachment area timestamp and separate layer timestamp, repeated and distinct targets, subset/removal readback. Store `appends ordered picture metadata for repeated targets and clones attachment results` also proves seeded entries and untargeted area preservation. |
| `returns deterministic errors for invalid or unknown bulk picture targets` | HTTP `rejects %s picture batch before metadata, pictures or counters change`: exact mismatch 400 and unknown-area 404 plus malformed values and valid+unknown batch atomicity. |
| `deletes mock layers and their area data with deterministic not-found behavior` | HTTP `deletes layer and area data with deterministic repeated-delete and detail errors`: success body, area/detail removal, list absence, repeated delete 404; unknown delete covered by error matrix. Store deletion case proves other layers unchanged and ID non-reuse. |
| `patches editable area properties while preserving protected feature data` | HTTP `patches editable area strings while preserving protected fields, geometry and neighbors` and corresponding store edit case: editable fields and exact server timestamp, protected ID/creation/layer/area, full unchanged geometry and readback; adds empty strings, pictures, attempted geometry/update-time overrides and neighbors. |
| `returns deterministic not-found responses for unknown layer and area mutations` | HTTP deterministic error matrix: exact missing layer vs area bodies for metadata PATCH and both area failure types; adds whole-state and counter assertions. Store failure matrix also retains tagged outcomes. |
| `returns method-not-allowed errors for out-of-scope mock mutations` | HTTP `returns 405 for $method $path before authorization`: POST `/layers` plus every unsupported standard verb on admin/layer/area routes, exact error and no state/counter change. |
| `keeps resettable mock seed data stable and returns cloned areas` | Store `seeds stable visible, hidden and empty layers with polygon and picture data` keeps all concrete IDs/timestamps, area attributes, picture serialization, first polygon point and empty collection; `creates fresh seed factories and clones every nested getter boundary` and reset/replay add nested clone and counter isolation. |

The anonymous wrapper case retains dispatch without upstream config/auth/fetch;
its full DTO/exclusion assertions now live in the HTTP projection case. The
verified wrapper case retains authenticated dispatch/no-fetch; full hidden-layer
column metadata is in the same HTTP projection case. All four non-mock transport
cases remain intact for F100.4. WFS seed centroids, empty collections, created-ID
mapping, mutation readback, auth/hidden filtering and error cases remain because
they prove wrapper/GeoServer integration. The picture WFS case additionally
reads back removal via area PATCH `pictures='[]'`. Empty TMS GET/HEAD, content
type and wrong-method checks remain. Existing client scenario/reset/bootstrap
cases remain unchanged; their cache/state contracts do not replace server reset.

### F100.2 execution evidence — 2026-09-28

Commands ran from `/workspace/project` unless the namespace is specified.
Ignored artifacts are under `.tmp/f100-2-coder-20260928/`; the complete expanded
commands and protected-file evidence are in the feature's `coder-report.md`.

| Reference | Command/check | Observed result |
| --- | --- | --- |
| M-baseline | `yarn test:luonnonmetsakartat --listTests --json`; `yarn test:luonnonmetsakartat` | Exit 0; 40 suites, 615 tests, zero snapshots; 4.900 s. Logs `discovery-baseline.log`, `jest-baseline.log`. |
| M-regression | `yarn test:luonnonmetsakartat --runTestsByPath src/applets/luonnonmetsakartat/server/api/mockDataStore.test.ts src/applets/luonnonmetsakartat/server/api/mockDataProxy.test.ts` | Before fixes: exit 1, 190 pass/6 fail. Five malformed path encodings threw URIError; production test reset did not refuse. After the two narrow fixes: exit 0, 196/196 cases, 2 suites. Logs `direct-before-fix.log`, `direct-after-fix.log`. |
| M-discovery | `yarn test:luonnonmetsakartat --listTests --json` | Exit 0; independent filesystem/allowlist comparison finds 19 applet + unchanged 23 shared = 42 suites. Exactly the two new suites were added; no baseline suite removed. Logs `discovery-final.log`, `inventory-and-preservation.log`. |
| M-J | `yarn test:luonnonmetsakartat` | Exit 0; 42 suites, 834 tests, zero snapshots; 11.202 s. Includes affected wrapper/scenario/reset/bootstrap/shared auth/userinfo tests. Log `jest-final.log`. |
| M-order | `yarn test:luonnonmetsakartat --runTestsByPath src/applets/luonnonmetsakartat/server/api/mockDataStore.test.ts src/applets/luonnonmetsakartat/server/api/mockDataProxy.test.ts --randomize --seed=1002 --showSeed` | Exit 0; seed 1002, 2 suites, 196 tests, zero snapshots; 1.536 s. Log `jest-randomized.log`. |
| M-types | `yarn start:typecheck`; `yarn exec tsc --project .tmp/f100-2-coder-20260928/tsconfig.tests.json --noEmit` | Both exit 0. First excludes tests; the temporary config separately includes all six changed/new test files and existing declaration shims. Logs `typecheck.log`, `test-types-final.log`. |
| M-lint | Changed-file ESLint; `yarn lint`; `git diff --check` | All exit 0. Changed files: zero errors, one existing unused `getFolayerCentroidSourceLayer` warning in mockDataProxy.ts, independently reproduced from HEAD via ESLint stdin. Full lint: zero errors, 309 warnings. Logs `lint-changed-final.log`, `lint-proxy-head.log`, `lint-full.log`, `diff-check.log`. |
| M-doctor | Runtime doctor command above, `/workspace/codex-orch` | Exit 0 and `exit.json` confirmed for run `20260928-150513-397959-runtime_doctor-F100.2-luonnonmetsakartat-mock-contract-tests`; verdict `RETRY_READY`. No repair/restart/configuration change. |
| M-smoke | `docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec -T app sh -lc 'cd /app && yarn luonnonmetsakartat:mock:smoke'` after RETRY_READY | Exit 0, `ok: true`, `xvfb-webgl`; all eight existing steps passed. Preflight 127.0.0.1:6900, browser localhost:6900 inside app container. Exactly one non-fatal browser console error reported; script did not expose its message. Log `smoke.log`. |

The final net increase is 219 cases, with 13 wrapper-only cases relocated and
196 direct cases added plus stronger shared/wrapper guard matrices. No new
framework, shared test harness, package/script/allowlist or environment-variable
change was needed. The only production edits are path-escape validation (catch
URIError only, retain encoded route matching/single field decode) and production
refusal in the exported test reset helper. Six failing regressions preceded
those fixes. Narrow test-file type checking also caught and resolved Jest tuple
inference and geometry narrowing issues; no public domain-type change was made.

The original four non-mock transport bodies and six WFS/TMS bodies were compared
unchanged with the baseline; the seventh WFS integration case was extended for
picture removal. All four unrelated protected files retain their original
content hashes and unstaged/untracked status. No files were staged or committed.

No rendered UI changed, so no additional visual fixture checks were needed.
The passing smoke leaves server-memory mutations and has a tolerated console
error; it does not complete F100.6 cleanup/strict-console acceptance. It is also
not real GeoServer/PostGIS/object-storage/Zitadel acceptance. Later checks that
need a pristine server seed must delegate that runtime work to the doctor.


### F100.3 import/replacement verification (2026-09-28)

- **I-baseline:** existing `common/utils.test.ts` and helper
  `utils/scripts/visual/luonnonmetsakartat-mock-smoke.test.js`: 2 suites / 11 tests.
  All existing map tests, smoke CLI/preflight tests and the two parser assertions
  remain; the new domain suite owns the expanded matrix.
- **I-J:** `yarn test:luonnonmetsakartat`: 49 suites / 929 tests passed.
  `--listTests --json` discovers all seven new applet suites and the unchanged
  23 shared allowlist entries; no package-script/config addition was needed.
- **I-focused:** the seven suites below: 7 suites / 95 tests passed.
- **I-shared:** shared DropDownSelectWithLabel, DropDownSelectInset,
  TextFieldWithLabel and Button tests: 4 suites / 34 tests passed.
- **I-browser:** doctor run `20260928-160735-809807-runtime_doctor-F100.3-luonnonmetsakartat-import-replacement-tests`
  exited 0 with `RETRY_READY`, requiring no repair. The subsequent app-container
  `yarn luonnonmetsakartat:mock:smoke` passed all 8 steps with `xvfb-webgl` and
  no reported console errors. Its duplicate-ID check registers a POST observer
  before Accept, waits for the visible persistent notification, and asserts zero
  create requests. Full lifecycle cleanup/strict global console policy is F100.6.

Exact focused command (from the project root):

```sh
yarn test:luonnonmetsakartat --runTestsByPath src/applets/luonnonmetsakartat/common/folayerShapefile.test.ts src/applets/luonnonmetsakartat/common/shpjsCompat.test.ts src/applets/luonnonmetsakartat/components/FolayerImportShp.test.tsx src/applets/luonnonmetsakartat/components/FolayerUpdateShp.test.tsx src/applets/luonnonmetsakartat/components/FolayerShapefile.races.test.tsx src/applets/luonnonmetsakartat/pages/admin/import/LuonnonmetsakartatAdminImportPage.test.tsx src/applets/luonnonmetsakartat/pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.replacement.test.tsx
```

The shared hook owns parse lifetime and warning confirmation; the pure
`common/folayerShapefile.ts` owns parser, detection and validation. Deferred
parser tests are limited to races; ordinary UI/page tests use actual ZIP bytes,
selectors, real FileReader, the real confirmation dialog/store and QueryClient,
with stubbed mutation functions and a visible notification adapter. No default
test uses a live service. Both pages clear prior upload state before reading;
old parse/read/confirmation results cannot submit a later file's bytes.

The new feedback uses Finnish Tolgee keys written via `tolgee-api-upsert`:
`sidebar.admin.create.error_invalid_shapefile` and `error_missing_columns`.
Existing `confirm_invalid_chars` and `error_invalid_chars_or_encoding` now show
problematic values instead of directing users to console errors. Exports were
refreshed with the download script; no downloaded JSON was manually edited.

F100.5 can reuse these seams without repeating the validation matrix. F100.6
should use the stable duplicate-pair fixture and visible error/request oracle.
Real backend ingestion, ID/pair geometry matching, preserve/delete effects and
cleanup remain opt-in live acceptance (L02), with disposable IDs and explicit
authorization. Neither a passing parser nor the mock proves those operations.

Final F100.3 verification also passed `yarn start:typecheck` and a temporary
TypeScript project including all seven new test suites (normal tsconfig excludes
tests). Changed-file lint has zero errors and only two pre-existing map utility
`any` warnings; full `yarn lint` has zero errors / 306 existing warnings.
The component-fixture check selected all eight import-control states and passed
16 desktop/mobile captures. Existing five states matched their before baselines;
the three new unparsed/parse-error states were inspected and initialized
intentionally. See `.dev/visual-regression/report/latest.json` for the local
report. The broad baseline command ignores `--files`; its unrelated remainder
was cancelled after the required old baselines were captured. No service was
restarted and no screenshot/log artifact is committed.

### F100.4 routing and transport verification (2026-09-28)

Implementation started on `luonnonmetsakartat` at
`d1adcb192e4aca3aa96c570fd7acf034f4127836`. Evidence is in ignored
`.tmp/f100-4-coder-20260928/`; the feature's `coder-report.md` records the
complete changed-file list, commands and limitations for local review/commit.
The audit retained the existing selection/metadata/build matrices, ordered
Carbon redirects, mock dispatch/production guards and WFS/TMS cases.

| Evidence | Command / result |
| --- | --- |
| R-baseline | `yarn test:luonnonmetsakartat`: exit 0, 49 suites / 929 tests. |
| R-discovery | `yarn test:luonnonmetsakartat --listTests --json`: exit 0; independent inventory confirms 27 applet + 24 literal shared = 51 suites. Only shared apiProxy and applet registration suites added; no prior suite removed or unrelated applet suite included. `python3 .tmp/f100-4-coder-20260928/verify-inventory.py` also confirms all nine required auth suites are selected and pass. |
| R-family | `yarn test:luonnonmetsakartat`: exit 0, 51 suites / 1,012 tests / 0 snapshots (35.419 s), including shared auth regressions. Existing IndexedDB-unavailable console messages and Zustand mock logs remain; no test failures. `family-final.log`. |
| R-shared | Exact command below: exit 0, 13 suites / 318 tests / 0 snapshots (3.347 s), including the entire Carbon proxy suite and Tolgee selection tests. `affected-final.log`. |
| R-red | New shared proxy suite before the production fix: exit 1, 29 passing and 4 failing cases. Three failures exposed raw exception logging; one was an invalid-URL classification assumption corrected to the existing Jest realm behavior. After the fixed-event logging change, all 33 shared proxy tests pass. `proxy-red.log`, `second-targeted.log`, final full runs. |
| R-types | `yarn start:typecheck` and `yarn exec tsc --project .tmp/f100-4-coder-20260928/tsconfig.tests.json`: both exit 0. The temporary project explicitly includes changed/new TS tests, Jest types, existing generated route declarations and required ambient declarations. The app tsconfig alone excludes tests. |
| R-lint | Explicit changed-file ESLint command in coder report: exit 0, 0 errors / 9 existing Carbon `any` warnings (independently reproduced from HEAD using ESLint stdin). Full `yarn lint`: exit 0, 0 errors / 306 warnings. `git diff --check`: exit 0. |
| R-smoke | Doctor run `20260928-172054-849508-runtime_doctor-F100.4-luonnonmetsakartat-routing-proxy-tests`: synchronous exit 0, `exit.json` read, report `RETRY_READY`, no runtime changes. Independent retry of the Docker command below: exit 0, `ok: true`, `xvfb-webgl`, eight existing steps passed, no console error reported. `smoke-retry.log`. |

Run deterministic checks from `/workspace/project` in the agent namespace:

```bash
yarn test --runInBand --runTestsByPath \
  src/common/routing/publicRoutes.test.ts \
  src/common/routing/requestRouting.test.ts \
  src/common/routing/appletSelectionContract.test.ts \
  src/common/routing/routeMetadata.test.ts \
  src/common/navigation/appRouteLinks.test.tsx \
  src/common/navigation/tolgee/shared.test.ts \
  utils/scripts/appletBuildConfig.test.js \
  utils/scripts/prebuildFolderPrune.test.js \
  utils/scripts/writeNetlifyRedirects.test.js \
  src/common/server/apiProxy.test.ts \
  src/applets/luonnonmetsakartat/server/api/dataProxy.test.ts \
  src/applets/luonnonmetsakartat/server/api/dataProxy.route.test.ts \
  src/applets/carbon/server/api/dataProxy.test.ts
```

The independent no-start retry used the doctor-verified app namespace:

```bash
docker compose -f /workspace/project/docker-compose.dev.yml \
  --project-directory /workspace/project exec -T app sh -lc \
  'cd /app && yarn luonnonmetsakartat:mock:smoke'
```

Only the shared catch logging boundary changed in production: it emits a fixed
configuration-key event without raw exceptions or request/backend details.
Public error responses, classification and header allowlists remain unchanged.
Invalid native-URL errors cross the Jest VM realm and follow the existing
non-`instanceof TypeError` branch there; injected TypeError and Error cases
separately protect both response classifications. No general upstream-content
scrubbing or post-response streaming-error handling was added.

Test-only Carbon changes assert that its optional mock dispatcher returns an
HTTP response and copy ZIP bytes into an ArrayBuffer-backed Uint8Array, allowing
the full affected suite to typecheck. Both existing Undici wrapper suites now
restore replaced global constructors. No rendered UI changes required visuals.
F100.5 retains page/auth rendering ownership. F100.6 retains lifecycle cleanup,
repeatability, strict console policy and rendered not-found checks; the existing
smoke still writes local mock memory and does not prove real services, deployed
Netlify rules or a running standalone artifact.
