# Luonnonmetsakartat Mock Browser Runbook

This runbook is for agent-driven Luonnonmetsakartat browser checks against the
already-running app-container dev server. Do not start, stop, restart, or kill
the shared dev server from this workflow.

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
hydration and clicks. If `:6900` is unreachable, stop and report that the main
dev server is unavailable. Do not launch a replacement `yarn dev` process.

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

The fixture manifest is
`test-data/luonnonmetsakartat/README.md`. The valid fixture should auto-detect
`id`, `nimi`, `kunta`, `maakunta`, `kuvaus`, and `pinta_ala`. The duplicate
fixture should stay on the import route and trigger duplicate-ID validation
before any create POST.

## Known Limitations

- The mock API does not emulate production GeoServer/vector tiles beyond the
  current mock API, WFS, and empty vector-tile endpoints.
- Import fixture geometry is used for client parsing and validation. The mock
  API creates deterministic mock areas rather than ingesting uploaded geometry.
- The picture save smoke uses in-memory mock picture fixture state from the
  `pictures-mapped` scenario, not a real OS directory picker.
- Server-side mock API storage can persist for the life of the dev-server
  process. Smoke flows parse created layer IDs dynamically and do not assume
  `mock-created-layer-1`.

## F100 coverage audit and focused Jest entrypoint

Audit started 2026-09-28 at `01b95e89aaaee417da233e4a06307e50b60a2f63`.
Existing assertions are retained; client transport tests have a different oracle
from the server mock lifecycle and do not replace it. No actual duplication was
found that warrants removing a suite.

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
| M01 | Reset/seed isolation | common/mockScenarios/reset.test.ts; scenarios.test.ts; server/api/dataProxy.test.ts: resettable cloned seed | mock/helper | partial / F100.2 | Direct store and proxy contracts | Existing suites pass J-baseline / J-final; stated gap pending |
| M02 | Anonymous visible/editor hidden filtering | server/api/dataProxy.test.ts: public/admin lists and WFS visibility/auth | mock | partial / F100.2 | Direct seams without duplicating wrapper dispatch | Existing suites pass J-baseline / J-final; stated gap pending |
| M03 | Validation states and protected operations | server/api/dataProxy.test.ts: validates verified/rejected/missing/unknown auth | mock | partial / F100.2 | Direct mock contract audit | Existing suites pass J-baseline / J-final; stated gap pending |
| M04 | Mock create/read/update/delete | server/api/dataProxy.test.ts: detail, multipart create, metadata PATCH, delete | mock | partial / F100.2 | Direct seam lifecycle | Existing suites pass J-baseline / J-final; stated gap pending |
| M05 | Mock replacement semantics and limits | server/api/dataProxy.test.ts: preserves areas with raw update zip | mock | partial / F100.2 | Validate represented semantics; never imply geometry reconciliation | Existing suites pass J-baseline / J-final; stated gap pending |
| M06 | Picture update/delete metadata | server/api/dataProxy.test.ts: bulk attachments and WFS readback | mock | partial / F100.2 | Direct update/delete metadata evidence | Existing suites pass J-baseline / J-final; stated gap pending |
| M07 | Unsupported routes/methods | server/api/dataProxy.test.ts: deterministic errors, method-not-allowed | mock | partial / F100.2 | Complete direct proxy boundary | Existing suites pass J-baseline / J-final; stated gap pending |
| M08 | Production guards for API/scenario/auth | server/api/dataProxy.test.ts: refuses production; common/mockScenarios/config.test.ts; shared src/common/auth/mock.test.ts and src/runtime/api/userinfo.test.ts | mock/unit | partial / F100.2 | Audit all guard entrypoints | Existing suites pass J-baseline / J-final; stated gap pending |
| I01 | Valid ZIP parsing and column detection | helper utils/scripts/visual/luonnonmetsakartat-mock-smoke.test.js: parses valid fixture | helper | partial / F100.3 | UI detection vs parser evidence | Existing suites pass J-baseline / J-final; stated gap pending |
| I02 | Missing shapefile parts and malformed ZIP | No direct test | unit/UI | pending F100.3 | Tiny deterministic fixtures | Pending child; no run claim |
| I03 | Duplicate ID | helper smoke test: duplicate-ID fixture exposes duplicates | helper | partial / F100.3 | Actual client validation before POST | Existing suites pass J-baseline / J-final; stated gap pending |
| I04 | Duplicate name + municipality | No direct test | unit/UI | pending F100.3 | Fixture and validation | Pending child; no run claim |
| I05 | Blank/invalid identifiers and strings | No direct test | unit/UI | pending F100.3 | Explicit validation cases | Pending child; no run claim |
| I06 | Encoding failures | No direct test | unit/UI | pending F100.3 | Deterministic failure fixture | Pending child; no run claim |
| I07 | Both indexing modes and optional columns | Existing tiny fixture manifest; transport belongs to A06/A08 | unit/UI | pending F100.3 | Selection/detection/validation | Existing suites pass J-baseline / J-final; stated gap pending |
| I08 | Replacement preserve/delete choice and handoff | No UI test | UI | pending F100.3 | Settings-to-mutation integration | Pending child; no run claim |
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
