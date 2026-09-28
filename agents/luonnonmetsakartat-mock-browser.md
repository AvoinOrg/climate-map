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
cd /workspace/codex-orch && PYTHONPATH=/workspace/codex-orch CODEX_ORCH_IN_CONTAINER=1 python3 -m codex_orch run-agent --project /workspace/project/.codex-orch/orch.toml --role runtime_doctor --feature F100.3-luonnonmetsakartat-import-replacement-tests
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
host spelling is `luonnonmetsakarta.netlify.app`. F100.4/F100.6 own the remaining
route evidence and final runbook reconciliation.

```bash
yarn test:luonnonmetsakartat --listTests --json
yarn test:luonnonmetsakartat
```

`jest.luonnonmetsakartat.config.ts` inherits the existing Jest configuration. It
selects every `*.test.*` / `*.spec.*` JS/JSX/TS/TSX suite below
`src/applets/luonnonmetsakartat/` plus 23 literal shared suites. The allowlist is
intentional: shared auth, map-request authorization, GeoServer config,
routing/build selection and smoke/fixture infrastructure contain multi-applet
assertions and run intact.
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
| R01 | Canonical main/standalone/locale contracts | shared src/common/routing/{publicRoutes,requestRouting,appletSelectionContract,routeMetadata}.test.ts; src/common/navigation/appRouteLinks.test.tsx; utils/scripts/{appletBuildConfig,prebuildFolderPrune}.test.js | unit | partial / F100.4 | Applet-specific regression audit | Existing suites pass J-baseline / J-final; stated gap pending |
| R02 | Configured host and removed legacy paths | shared utils/scripts/writeNetlifyRedirects.test.js: no Luonnonmetsakartat legacy redirects; publicRoutes.test.ts | unit | partial / F100.4 | Exact host spelling and negative/pass-through behavior | Existing suites pass J-baseline / J-final; stated gap pending |
| R03 | GET/POST/PUT/PATCH/DELETE forwarding | server/api/dataProxy.test.ts: live-proxy GET and PATCH | transport | partial / F100.4 | Remaining methods and shared proxy suite | Existing suites pass J-baseline / J-final; stated gap pending |
| R04 | Query/header/body/status forwarding | server/api/dataProxy.test.ts: matching upstream path/query, allowlisted headers/body | transport | partial / F100.4 | Error/body/status and complete method matrix | Existing suites pass J-baseline / J-final; stated gap pending |
| R05 | Missing backend config and secret-safe failures | server/api/dataProxy.test.ts: 500 without upstream config | transport | partial / F100.4 | Secret-safe failures and shared proxy errors | Existing suites pass J-baseline / J-final; stated gap pending |
| G01 | Public loading/layers/empty/dependency error | common/mockScenarios/scenarios.test.ts: public state; shared fixture registry/scenario metadata | seed/helper | pending F100.5 | Rendered states, not seeded-data assertions | Existing suites pass J-baseline / J-final; stated gap pending |
| G02 | Unauthenticated/pending/missing-token/rejected/error/verified gate | Shared auth/client states; validation HTTP is A04 | client/seed | pending F100.5 | No editor controls on failed auth | Existing suites pass J-baseline / J-final; stated gap pending |
| G03 | Admin empty/list/detail | common/mockScenarios/scenarios.test.ts: admin layer/area seeds | seed | pending F100.5 | Rendered navigation and detail | Existing suites pass J-baseline / J-final; stated gap pending |
| G04 | Settings clean/dirty/saving/error | common/mockScenarios/scenarios.test.ts: settings variants | seed | pending F100.5 | Interactions and observable save/error | Existing suites pass J-baseline / J-final; stated gap pending |
| G05 | Pictures empty/matched/unmatched/save/error | common/mockScenarios/scenarios.test.ts: picture variants | seed | pending F100.5 | Mapping interactions; transport is A10 | Existing suites pass J-baseline / J-final; stated gap pending |
| G06 | Area edit UI | Existing smoke lacks full lifecycle edit | UI | pending F100.5 | Accessible controls and save/error | Pending child; no run claim |
| G07 | Destructive confirmation | No direct rendering test | UI | pending F100.5 | Confirm/cancel behavior | Pending child; no run claim |
| G08 | No retry/remount loops or editing exposure on rejection | Shared auth token resolution tests only | UI | pending F100.5 | Real gate/query integration | Existing suites pass J-baseline / J-final; stated gap pending |
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
