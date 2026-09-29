# Luonnonmetsakartat mock lifecycle runbook

The stable `yarn luonnonmetsakartat:mock:smoke` command uses the existing
Playwright/Xvfb/WebGL harness against a doctor-verified **TanStack Start** dev
server. It never starts/restarts a service. One run uses real application
controls and frontend queries to import, edit, read back and delete its own
layer in the in-memory HTTP API. This is not real-stack acceptance.

## Prerequisites and runtime delegation

Run deterministic checks from `/workspace/project` with installed dependencies.
The browser requires installed Playwright Chromium (`yarn visual:install`),
Xvfb and working WebGL/SwiftShader. Delegate diagnosis, installation/setup,
test-environment changes, service lifecycle and recovery to `runtime_doctor`.
The current app container is already configured with:

```bash
PUBLIC_COMPILED_APPLETS=main,luonnonmetsakartat
PUBLIC_MOCK_AUTH_ENABLED=1
PUBLIC_MOCK_AUTH_INITIAL_STATE=authenticated
PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED=1
LUONNONMETSAKARTAT_MOCK_API_ENABLED=1
```

Standalone uses `PUBLIC_COMPILED_APPLETS=luonnonmetsakartat` instead. The runner
reads the effective process selection/flags inside that container and verifies
canonical navigation; hostname does not select a mode. It refuses an unselected
or ambiguous build, missing mock flags, production, or a non-loopback write
target before any mutation. Production guards independently prohibit API,
scenario and auth enablement. The smoke chooses explicit authenticated,
unauthenticated and rejected identities; it does not depend on the initial auth
state or load a real account's storage state.

The current server's internal port is **6900**, not the stale Next.js/3000
values in historical orchestration context. Run the browser in `/app` inside
the Compose `app` service. Preflight uses `127.0.0.1:6900`; Chromium navigation
uses `localhost:6900`. Do not interpret agent-container loopback as the app.
Ordinary repository `.env` defaults are not the configured service's flags.

Invoke the doctor with the observed failure and intended verification command:

```bash
cd /workspace/codex-orch && PYTHONPATH=/workspace/codex-orch CODEX_ORCH_IN_CONTAINER=1 python3 -m codex_orch run-agent --project /workspace/project/.codex-orch/orch.toml --role runtime_doctor --feature F100.6-luonnonmetsakartat-lifecycle-smoke-runbook
```

The command is synchronous. Poll the same yielded shell session to exit, read
that run's `exit.json`, then the feature's `runtime-doctor-report.md`. Retry the
affected check after `RETRY_READY`. Send a remaining `RUNTIME_BLOCKED` issue to
the manager with the report's exact URL/mode/flag/browser evidence while
finishing independent deterministic checks. No-start means runtime work is
delegated. It does not prohibit doctor access. For later work use its feature ID.
A restart must never stand in for owned smoke cleanup or repeatability evidence.

## Exact verification commands

Run in `/workspace/project`, with ordinary test-process environment:

```bash
yarn test:luonnonmetsakartat --listTests --json
yarn test:luonnonmetsakartat --runTestsByPath utils/scripts/visual/luonnonmetsakartat-mock-smoke.test.js
yarn test:luonnonmetsakartat
yarn start:typecheck
yarn exec eslint src/applets/luonnonmetsakartat/pages/admin/layer/folayer/LuonnonmetsakartatAdminLayerFolayerPage.test.tsx src/applets/luonnonmetsakartat/common/hooks/useAdminFolayer.ts src/applets/luonnonmetsakartat/pages/admin/layer/folayer/LuonnonmetsakartatAdminLayerFolayerRuntime.tsx src/applets/luonnonmetsakartat/pages/admin/LuonnonmetsakartatAdminAccess.test.tsx src/applets/luonnonmetsakartat/pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.test.tsx utils/scripts/visual/luonnonmetsakartat-mock-smoke.js utils/scripts/visual/luonnonmetsakartat-smoke-lifecycle.js utils/scripts/visual/luonnonmetsakartat-mock-smoke.test.js
yarn lint
git diff --check
```

The deletion regressions can be isolated with:

```bash
yarn test:luonnonmetsakartat --runTestsByPath src/applets/luonnonmetsakartat/pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.test.tsx
```

App typecheck excludes tests. To reproduce the explicit changed-test typecheck:

```bash
mkdir -p .tmp
cat > .tmp/f1006-correction-test-tsconfig.json <<'JSON'
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "incremental": false,
    "types": ["node", "vite/client", "jest", "@testing-library/jest-dom"]
  },
  "include": [
    "../src/**/*.d.ts",
    "../src/applets/luonnonmetsakartat/pages/admin/layer/folayer/LuonnonmetsakartatAdminLayerFolayerPage.test.tsx",
    "../src/applets/luonnonmetsakartat/pages/admin/LuonnonmetsakartatAdminAccess.test.tsx",
    "../src/applets/luonnonmetsakartat/pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.test.tsx"
  ],
  "exclude": ["../node_modules"]
}
JSON
yarn exec tsc --project .tmp/f1006-correction-test-tsconfig.json
```

Affected shared routing/auth/proxy/build checks, including the other applet's
existing shared-proxy regression, can also be run explicitly:

```bash
yarn test --runInBand --runTestsByPath \
  src/common/navigation/appRouteLinks.test.tsx \
  src/common/routing/publicRoutes.test.ts \
  src/common/routing/requestRouting.test.ts \
  src/common/routing/appletSelectionContract.test.ts \
  src/common/routing/routeMetadata.test.ts \
  src/common/auth/client.test.tsx \
  src/common/auth/mock.test.ts \
  src/runtime/api/userinfo.test.ts \
  src/common/server/apiProxy.test.ts \
  utils/scripts/appletBuildConfig.test.js \
  utils/scripts/prebuildFolderPrune.test.js \
  utils/scripts/writeNetlifyRedirects.test.js \
  src/applets/carbon/server/api/dataProxy.test.ts
```

If Jest must run inside the mock-enabled app container, isolate only that test
process from its inherited browser flags (do not edit the service environment):

```bash
docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec -T app sh -lc 'cd /app && env -u PUBLIC_MOCK_AUTH_ENABLED -u PUBLIC_MOCK_AUTH_INITIAL_STATE -u PUBLIC_LUONNONMETSAKARTAT_MOCK_SCENARIOS_ENABLED -u LUONNONMETSAKARTAT_MOCK_API_ENABLED yarn test:luonnonmetsakartat'
```

After doctor readiness, run this command **twice, separately, with no source
edits, service reset/restart or configuration change between runs**:

```bash
docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec -T app sh -lc 'cd /app && yarn luonnonmetsakartat:mock:smoke'
```

Both must exit 0 with distinct `runId`, `liveMode`, discovered `createdIds`,
exactly one create attempt, preserved baseline count, and verified cleanup with
no unresolved IDs. Success is printed only after issue collection and all
context/browser closes. Then demonstrate failure cleanup using the same runner:

```bash
docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec -T app sh -lc 'cd /app && yarn luonnonmetsakartat:mock:smoke --fail-after-import'
```

This must exit **1** with the deliberate post-import primary error, the created
ID and `cleanup.verified: true`, matching attempted/absent IDs and no unresolved
IDs. Zero is a failed diagnostic. Cleanup errors are also a failed diagnostic,
not the intended outcome. Follow with another ordinary passing run. Helper
regressions inject DELETE/readback/close failures without harming the runtime.

For CLI options: `node utils/scripts/visual/luonnonmetsakartat-mock-smoke.js --help`.
A runner/docs-only change requires no visual comparison. F100.6's deletion
query fix uses the existing full-page mock scenarios, including settings and
admin rows (the isolated component-fixture set has no settings-page fixture):

```bash
docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec -T app sh -lc 'cd /app && yarn visual:after-edit -- --no-start --scenario-set luonnonmetsakartat-mocks src/applets/luonnonmetsakartat/common/hooks/useAdminFolayer.ts src/applets/luonnonmetsakartat/pages/admin/layer/folayer/LuonnonmetsakartatAdminLayerFolayerRuntime.tsx'
```

These seeded screenshots check rendering only. They cannot establish persistence;
the unseeded lifecycle above supplies that evidence.

## What the lifecycle proves

The script uses one uniquely named layer and discovered layer/area IDs. It:

1. Reads and renders visible layers anonymously with no Authorization header;
   exercises real logged-out, rejected (validate 403) and authorized gates.
2. Parses the duplicate-ID and duplicate-pair ZIPs, explicitly selecting pair
   indexing for the latter. Specific visible errors and unchanged route precede
   route exit; every POST attempt is counted, including aborted/failed requests.
3. Imports `valid-layer.zip`, detects columns, follows the returned ID to detail,
   reloads through real detail/WFS queries, and proves hidden exclusion using a
   fresh anonymous public context.
4. Uses actual detail links to settings and pictures. It saves a run-specific
   name, keyboard hue edit and visible/hidden/visible transitions, checks exact
   submitted fields, reloads controls from GET, and checks fresh public reads.
5. Opens SearchTable's discovered area, edits its description and saves. Fresh
   WFS and a reopened editor retain that ID/value; another area is unchanged.
6. Supplies raw PNG File inputs through the directory input's normal change
   path. Automatic matching, unmatched warning/counts, manual assignment and
   clear occur in real controls. Partial save excludes the unmatched file and
   aligns two filenames with repeated area IDs. WFS then returns those filenames
   on the correct area, and its real gallery consumes normalized metadata.
7. Probes locale normalization/search preservation and all four removed Finnish
   tails in the available mode. An authorized admin gate lets the unknown
   child render its actual not-found outlet; no tail is translated/restored.
8. Cancels deletion (zero DELETE), reopens/confirms (one DELETE), then verifies
   fresh authenticated/public list absence and the exact detail 404.

The small adjacent lifecycle helper provides ownership, FormData observation,
strict diagnostics and failure aggregation to this same runner and Jest suite.
There is no second browser harness. Chromium omits `postDataBuffer()` for file
multipart requests; an init script observes original native
`XMLHttpRequest.send(FormData)` entries and passes the **same body unchanged**.
A binding correlates page/method/URL with independent network requests, survives
navigation, and fails on missing evidence. It does not intercept/mutate API
responses, seed mappings or install successful query/store state.

Only after returned metadata is checked, the runner fulfills exact owned
`https://example.org/mock/uploads/<layer>/<area>/<index>-<filename>` image URLs
and their exact `?width=200&resize=cover&quality=80&dpr=2` variants with tiny PNG
bytes. Layer/area/create/PATCH/WFS responses always come from the server.

## Ownership, storage and failure behavior

Names contain timestamp plus UUID. The runner captures the authenticated layer
baseline before mutations, registers returned IDs before navigation assertions,
and observes creates for every context through teardown. Lost-response recovery
matches **exact run-owned names absent from the baseline**, including rename
variants and unexpected negative-test creates. Prefix matches, fixed IDs, list
order and “all additions since baseline” are never ownership proof.

Finally cleanup waits for observable completion with a bounded deadline, attempts
all owned IDs independently, accepts only the mock's exact already-absent 404,
and checks authenticated detail/list absence plus anonymous absence. It compares
all unrelated baseline layer records and membership; concurrent unrelated changes
are reported, never deleted. An owned ID renamed externally is left for review.
Aborted/incomplete creates have ambiguous server acceptance and fail cleanup
certification even if an early list is empty. Failure output identifies exact
owned names/IDs, attempted/absent/unresolved IDs and unresolved creates. Primary,
cleanup/readback, console/page and independent close failures are aggregated;
none is replaced by a later exception. Do not manually delete by a smoke prefix.
Use the report's ownership evidence and involve the manager/doctor if recovery
requires runtime intervention.

Server mock state/counters persist for the process lifetime. `mockReset=1` clears
client Zustand and query state only. It is **not** a server reset. Unit tests may
use the guarded store reset with before/after isolation; browser runs do not.

Visual fixture scenarios are a different tool: `yarn visual:luonnonmetsakartat-mocks`
uses `mockReset=1&mockLuonnonmetsakartatState=<state>` and may prefill layer/query/
verification/mapping state. They retain their original semantics. Lifecycle URLs
omit both parameters and set only `mockAuth` when selecting an identity. A seeded
screen or successful mutation response alone is never persistence evidence.

## Strict browser diagnostics

Every page error and every unexpected console **error** fails, including unknown
sources, all applet/application errors, and late errors during cleanup/close.
Duplicate validation must not console.error. One narrowly checked third-party
background-tile transport diagnostic is tolerated as described below.

Expected denial/not-found diagnostics are Chromium-generated negative HTTP
resource messages after the corresponding response **and UI assertion** pass:

- GET `/api/luonnonmetsakartat/admin/validate`, status 403, phase
  `rejected admin gate`, exact message
  `Failed to load resource: the server responded with a status of 403 (Forbidden)`.
- GET the exact untranslated historical document URL including search, status
  404, phase `canonical/locales/removed legacy routes (live main)` (or standalone),
  exact message
  `Failed to load resource: the server responded with a status of 404 (Not Found)`.

Both require the same page, exact response URL, zero console arguments and
resource location line/column 0. The same text from application console.error,
another endpoint/status/phase, or an unasserted negative response fails. Tolerated
entries are printed with source/message/phase rather than an unexplained count.

A separate observed exception is the shared MML background raster service:
GET same-origin `/api/map/core/mml/tms/<numeric-z>/<numeric-x>/<numeric-y>` with
**exactly** `?layer=taustakartta`, status 500, and response body **exactly**
`Tile upstream request failed`. It is accepted only in `area metadata UI edit
and WFS readback` or `canonical/locales/removed legacy routes (live main)`
(or standalone), on that same page/URL/phase, with zero console arguments,
line/column 0 and exact browser message
`Failed to load resource: the server responded with a status of 500 (Internal Server Error)`.
The collector awaits body inspection before deciding. `API key not configured`,
other bodies, statuses, methods, layers, queries, phases and application-issued
console errors remain fatal. Unreadable response evidence also fails.

This exception was added only after strict runs failed on z=8 and z=13 tiles
and runtime doctor found `MML tile proxy request failed` / `UND_ERR_SOCKET` in
service logs, without a mock API/runtime failure. `src/runtime/api/mmlTileProxy.ts`
returns the checked body only from its upstream-fetch catch, distinct from
missing configuration; the existing proxy suite covers the other branches.
It does not exempt Luonnonmetsakartat TMS/WFS or prove background-map service
availability. No tile response is fulfilled or rewritten by this smoke.

## Routes and build modes

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
normalization evidence, not rendered not-found evidence. The lifecycle checks
rendered not-found behavior in the available runtime mode after the admin gate
verifies; anonymous visitors still see the normal admin login hint. Carbon's retained Finnish
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
runtime diagnosis/setup/configuration/recovery to runtime doctor. Default
transport tests never use a real upstream or credentials. Live proxy acceptance
is a separate operator-authorized phase, not part of the mock smoke.


## Fixture and external limits

The [fixture manifest](../test-data/luonnonmetsakartat/README.md) lists all five
small ZIPs and their deterministic generator. The lifecycle uses valid,
duplicate-ID and duplicate-name/municipality archives; encoding/invalid archive
and replacement matrices remain in focused Jest, not duplicated in Playwright.

- Mock import creates synthetic polygons/areas/IDs/timestamps. It does not ingest
  or validate ZIP geometry. WFS projects simple centroid points; TMS returns
  empty PBFs. A passing map shell is not GeoServer/PostGIS rendering acceptance.
- Replacement serializes both indexing strategies and preserve/delete flags;
  the mock validates that flag but preserves existing areas/geometry with an
  uninterpreted ZIP. Actual matching, replacement and deletion belong to L02.
- Picture writes store ordered URL/filename metadata, not bytes. Area PATCH can
  replace/remove serialized picture lists; no saved-picture delete editor exists.
  A09/M06 test removal transport/store/WFS, G06 tests refreshed gallery removal.
  Storage upload/decoding/deletion and real image-proxy behavior belong to L03.
- Fixed verified/rejected mock identities prove frontend/HTTP gates, not real
  Zitadel login, renewal or roles. No real user storage-state file is consumed.
- I05/I06 characterize current frontend limits: present-column blank/null and
  non-string values are not independently rejected; IDs stringify without
  trimming/case folding, zero counts, null skips; pairs are case-sensitive and
  skip falsy members. The alphabet/Ã warning is a heuristic, not comprehensive
  encoding detection. Description and area values are not validated. Missing
  SHX/PRJ/CPG may parse these tiny WGS84 fixtures; arbitrary CRS/CPG support is
  not inferred. Mock acceptance is not production validation policy.
- Main and standalone construction/normalization/pruning are deterministic tests.
  The live smoke proves only its printed mode. Generated Netlify redirect/proxy
  rules are tested, but a deployed CDN is not contacted.

Real GeoServer/PostGIS ingestion, replacement reconciliation, Zitadel and object
storage/CDN acceptance remain a **separate opt-in operator-authorized phase**.
The operator must supply the intended environment, credentials/roles and expected
backend contract, record pre-existing state, use disposable IDs/names, read back
through the deployed frontend/backend, and verify targeted cleanup afterward.
Those prerequisites are absent from default commands. No default check writes
to real/shared external services, and this feature reports no real-stack pass.

## Coverage ledger and discovery boundary

`jest.luonnonmetsakartat.config.ts` automatically selects applet tests and 24
literal shared suites (auth/map-request auth, GeoServer config, navigation/
routing/build, API proxy and fixture/smoke infrastructure). Current inventory:
35 applet + 24 shared = 59 suites. It includes full shared matrices; unrelated
Carbon/Energy suites are excluded from this focused command. The explicit
shared command above additionally reruns Carbon's shared-proxy regression.

Audit the discovered paths against filesystem inventory plus the literal
allowlist after adding tests. Discovery is not execution. App tsconfig excludes
TS tests; if TS tests change, also typecheck them with a temporary explicit test
project. F100.6 prevents admin rows from preloading deleting or absent layer records,
and prevents the outgoing detail runtime from remounting after its route has
changed during the delete/navigation transition. Its changed TS page tests
receive the explicit test typecheck recorded below.

The manager's 2026-09-29 scope clarification confirms that the complete approved
local-verification scope is the processed F100 inbox request
(`.codex-orch/feature-inbox/processed/20260928T103029Z-20260928-luonnonmetsakartat-complete-test-coverage.md`),
the F100 parent short spec and architecture decision, and the direct child
specs. The A/M/I/R/G/B/L ledger below reconciles that scope; H rows retain
supporting shared coverage. The parent architecture explicitly directs children
to record the absent separate “local verification plan” and map the explicit
parent requirements. That source is absent from the permitted inputs/current
checkout; no unseen source is certified. This is a recorded provenance limit,
not an open frontend-test exemption or a pending scope decision. The September
28 runtime-doctor clarification supersedes the old inbox's runtime prohibitions.

Paths below are relative to `src/applets/luonnonmetsakartat` unless marked shared
or helper. The browser evidence is the existing runner in `utils/scripts/visual`;
its helper cases are in `luonnonmetsakartat-mock-smoke.test.js`. F100.1–F100.5
identify originating ownership; final verification references below supersede
historical pass counts. L01–L03 are concrete external service boundaries, not
missing frontend tests.

| ID | Required behavior | Current test/case evidence | Level | Status / owner | Limitation or next evidence | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| A01 | Anonymous list, normalization, public/admin separation | common/queries/folayerQueries.test.tsx: public layer list / anonymous transport and replaces obsolete records; retains public list on rejection | client | added-and-verified / F100.1 | Anonymous response projection omits admin fields; hidden-layer filtering: M02/B01 | F-family |
| A02 | Admin list/detail and query keys | common/queries/folayerQueries.test.tsx: admin list/detail / normalizes, defaults, suppresses detail, retains data and recovers | client | added-and-verified / F100.1 | Preserves public/admin timestamp-unit differences; no public detail endpoint | F-family |
| A03 | All protected operations fail closed without token | common/queries/authHeaders.test.ts plus each client suite: token undefined/empty fail-closed cases | client | added-and-verified / F100.1 | Real header helper, zero HTTP calls for every protected consumer; query state remains recoverable | F-family |
| A04 | Verification Pending/NoUser/Verified/Rejected/Errored | common/queries/adminVerificationQuery.test.tsx: settles without HTTP, strict roles, rejected status matrix, unexpected errors, user keys | client | added-and-verified / F100.1 | HTTP state/result/settlement evidence only; rendering/remount loops: G02/G08 | F-family |
| A05 | Public/admin area URLs and missing config | common/queries/folayerGeoServerQueries.test.tsx: normalized URL, missing config, IDs/picture normalization, suppression and recovery | client | added-and-verified / F100.1 | Public/admin keys and headers differ; both still share area store; logout/UI cleanup: G02/G08 | F-family |
| A06 | Layer create, both indexing strategies and columns | common/queries/adminFolayerPostMutation.test.tsx: creates via each indexing strategy, optional fields, ZIP bytes, 200/201; rejected-status matrix | client | added-and-verified / F100.1 | Multipart transport and response store only; parser/ingestion excluded | F-family |
| A07 | Settings/visibility update | common/queries/adminFolayerPatchMutation.test.tsx: saves settings/inverts visibility, omits absent fields, failures | client | added-and-verified / F100.1 | Server response normalization and notification kinds; rendered settings: G04/B04 | F-family |
| A08 | Replacement preserve/delete payload | common/queries/adminFolayerPatchMutation.test.tsx: serializes each replacement strategy with true/false/undefined flag | client | added-and-verified / F100.1 | ZIP bytes/name/MIME verified; geometry reconciliation is L02 | F-family |
| A09 | Area edit | common/queries/adminFolayerAreaPatchMutation.test.tsx: own non-null properties, targeted merge, picture removal, failure matrix | client | added-and-verified / F100.1 | Empty strings retained, inherited/null/undefined omitted, geometry untouched; editable API type has no numeric fields | F-family |
| A10 | Aligned picture files/area IDs and invalid pairs | common/queries/adminFolayerPatchMutation.test.tsx: repeated images/IDs aligned; empty/absent arrays; five invalid-pair cases | client | added-and-verified / F100.1 | Order, bytes and repeated IDs verified; UI matching: G05/B06 | F-family |
| A11 | Delete, callback order, rollback, already absent | common/queries/adminFolayerDeleteMutation.test.tsx: callback awaited, 200/204, resolved/rejected 404, rollback, no token | client | added-and-verified / F100.1 | Axios 404 is idempotent success; other rejections remain errors; UI confirmation: G07/B07 | F-family |
| A12 | Cache invalidation/refetch and failure isolation | common/queries/adminFolayerPatchMutation.test.tsx: settings/ZIP/pictures cache matrix × neither/public-conf/public-areas; rejected-status cases | client | added-and-verified / F100.1 | Real active observers and public HTTP readback; area refresh callbacks are isolated query fixtures; unrelated keys unaffected | F-family |
| M01 | Reset/seed isolation | server/api/mockDataStore.test.ts: `seeds stable visible, hidden and empty layers`, `creates fresh seed factories`, `clones create and update column inputs`, `replays a mixed lifecycle after reset`; existing client reset/scenario/bootstrap suites retained | store/helper | added-and-verified / F100.2 | Whole nested state, both counters, mutation-result clones and failure replay; client reset does not reset server memory | F-family |
| M02 | Anonymous visible/editor hidden filtering | server/api/mockDataProxy.test.ts: `projects anonymous visible layers and editor hidden/admin metadata, following visibility changes`; retained dataProxy WFS visibility/auth and dispatch cases | HTTP/integration | added-and-verified / F100.2 | Public projection excludes admin fields and embedded areas; detail remains editor-only | F-family |
| M03 | Validation states and protected operations | server/api/mockDataProxy.test.ts: `validates %s authorization`, `protected %s / denies %s before parsing or mutation`; store failure matrix | HTTP/store | added-and-verified / F100.2 | Six mutation forms, malformed/unknown credentials, no public fallback; full-state and future ID/timestamp equality | F-family |
| M04 | Mock create/read/update/delete | server/api/mockDataProxy.test.ts: `creates and reads %s columns`, `preserves omitted metadata and columns`, `patches editable area strings`, `deletes layer and area data`; store lifecycle/edit cases | HTTP/store | added-and-verified / F100.2 | Synthetic areas, protected fields, clone boundaries, cleanup and exact 404s; no live ingestion | F-family |
| M05 | Mock replacement semantics and limits | server/api/mockDataProxy.test.ts: `preserves seeded areas with an uninterpreted ZIP when delete_areas_not_updated is %s`, `rejects malformed PATCH %s atomically` | HTTP | added-and-verified / F100.2 | True/false/omitted, blank-as-omitted and malformed flags; complete areas unchanged, no geometry reconciliation | F-family |
| M06 | Picture update/delete metadata | server/api/mockDataProxy.test.ts: `attaches ordered filename URL metadata, then replaces and removes the picture list without storage operations`, `rejects %s picture batch`; store append/recovery cases; dataProxy WFS removal readback | HTTP/store/integration | added-and-verified / F100.2 | Ordered repeated targets, seed retention, malformed pairs, valid+unknown atomicity; no binary/storage operations | F-family |
| M07 | Unsupported routes/methods | server/api/mockDataProxy.test.ts: `returns 405 for $method $path`, deterministic not-found/path matrices, unsupported GeoServer cases, malformed percent encoding and valid encoded counterpart; retained wrapper TMS/WFS errors | HTTP/integration | added-and-verified / F100.2 | Malformed path escape now deterministic JSON 400; no route-policy changes | F-family |
| M08 | Production guards for API/scenario/auth | mockDataProxy runtime enablement; dataProxy protected-write/default-env guard; common/mockScenarios/config.test.ts runtime getter; shared src/common/auth/mock.test.ts config/getter and src/runtime/api/userinfo.test.ts endpoint; store production reset refusal | guard/unit | added-and-verified / F100.2 | Truthy matrix, explicit/default env, disabled production branch, no token/config/fetch access on refusal, unchanged store/counters | F-family |
| I01 | Valid ZIP parsing and column detection | common/folayerShapefile.test.ts: `parses two real WGS84 polygons`, `detects case-insensitively`; components/FolayerImportShp.test.tsx and FolayerUpdateShp.test.tsx: detected/manual columns | parser/UI | added-and-verified / F100.3 | First-feature columns; homogeneous multi-collection merge only. Existing two smoke-helper parser cases retained. | F-family |
| I02 | Missing shapefile parts and malformed ZIP | common/folayerShapefile.test.ts: `rejects %s safely`, `missing DBF`, `tolerates missing %s`, empty collection; both controls: failure/recovery; both pages: no mutation on parse failure | parser/UI | added-and-verified / F100.3 | SHP required by parser; DBF omission blocks selectors; SHX/PRJ/CPG tolerated for these fixtures, not arbitrary projections/encodings. | F-family |
| I03 | Duplicate ID | common/folayerShapefile.test.ts: numeric/string/zero/prototype IDs; both controls: duplicate-ID rejection; import page `does not create from %s`; settings `never patches hard invalid %s` | parser/UI | added-and-verified / F100.3 | Hard duplicates precede warnings. Browser now observes visible notification and zero create requests, without a console-error success signal. | F-family |
| I04 | Duplicate name + municipality | common/folayerShapefile.test.ts: real duplicate-pair fixture and tuple-label collision; both controls and both page suites block the pair before mutation | parser/UI | added-and-verified / F100.3 | Unique IDs isolate pair duplication; strategy contrast covered. F100.6 consumes duplicate-name-municipality-layer.zip for browser coverage. | F-family |
| I05 | Blank/invalid identifiers and strings | common/folayerShapefile.test.ts: `does not invent an ID format rule`, `characterizes permissive string value handling`, required columns, deduplication and unsupported alphabet; control clearing/ref guards | policy/UI | added-and-verified / F100.3 | Present-column blank/null/non-string values remain permissive; IDs stringify, zero counts, null skips, no trimming/case folding. These are frontend limits, not backend acceptance. | F-family |
| I06 | Encoding failures | common/folayerShapefile.test.ts: real UTF-8 Finnish/mojibake and invalid-byte variant; both control suites: real dialog confirm/cancel; replacement page: cancellation sends nothing | parser/UI | added-and-verified / F100.3 | Pair identity errors block; ID name/municipality/region errors warn. Literal Ã and unsupported characters are heuristic, not comprehensive encoding detection. | F-family |
| I07 | Both indexing modes and optional columns | common/folayerShapefile.test.ts: detection/saved mapping/optional values; both controls: selection/clearing and locked replacement strategy; import page exact payload | parser/UI | added-and-verified / F100.3 | Required mappings must exist. Optional missing mappings are cleared/detected; descriptions/areas are not value-validated. A06/A08 retain HTTP serialization ownership. | F-family |
| I08 | Replacement preserve/delete choice and handoff | pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.replacement.test.tsx: both strategies, default false/toggle true/back false, exact bytes, confirmation/cancellation, reset, no-file save and FileReader races; components/FolayerShapefile.races.test.tsx | UI | added-and-verified / F100.3 | No fallback to unvalidated bytes. M05 remains mock semantics; L02 remains live geometry reconciliation; G04 remains general settings behavior. | F-family |
| R01 | Canonical main/standalone/locale contracts | shared src/common/routing/{publicRoutes,requestRouting,appletSelectionContract,routeMetadata}.test.ts; src/common/navigation/appRouteLinks.test.tsx: six source-bound route keys in both modes; utils/scripts/{appletBuildConfig,prebuildFolderPrune}.test.js: actual source promotion/main retention | unit/build | added-and-verified / F100.4 | Stub href router proves delegation; no standalone running-build or page rendering claim | F-family / F-shared |
| R02 | Configured host and removed legacy paths | shared requestRouting.test.ts: configured host and all four unsupported tails in both modes; publicRoutes.test.ts: empty aliases/no translation; utils/scripts/writeNetlifyRedirects.test.js: literal manifest hostname, protocols, ordering, unselected omission | unit/build | added-and-verified / F100.4 | Generic locale/prefix normalization preserves legacy tails; rendered not-found: B08; deployed CDN remains separate live acceptance | F-family / F-shared |
| R03 | GET/POST/PUT/PATCH/DELETE forwarding | server/api/dataProxy.test.ts: all five live methods through real helper; dataProxy.route.test.ts: exact Start route, five wrapper identities and stubbed round-trip | transport | added-and-verified / F100.4 | Constructed HTTP objects and injected upstream only | F-family / F-shared |
| R04 | Query/header/body/status forwarding | shared src/common/server/apiProxy.test.ts: encoded/repeated/empty query, base path, header allowlists, multipart/binary/JSON bytes, DELETE with/without body, GET/HEAD, null 204/205/304, empty 200, HTTP error propagation | transport | added-and-verified / F100.4 | Stream failures after returning a response and real backend behavior remain outside this catch boundary | F-family / F-shared |
| R05 | Missing backend config and secret-safe failures | shared src/common/server/apiProxy.test.ts: absent/blank config, missing tail, fetch/setup/body-read failures, exact safe logger args/full local response; Carbon dataProxy.test.ts: TypeError/Error regressions | transport | fixed-and-verified / F100.4 | Fixed logging event only; upstream HTTP bodies intentionally propagate unchanged | F-family / F-shared |
| G01 | Public loading/layers/empty/dependency error | pages/LuonnonmetsakartatHomePage.test.tsx: `loads anonymous rows`, `shows an empty success`, `renders failed list feedback`, `renders area dependency failure`, `keeps a usable row with missing GeoServer config`, `retains public rows on failed refresh` | rendered/integration | added-and-verified / F100.5.1 | Real page/row/hook/query/store; controlled map operations and HTTP. Missing GeoServer config safely leaves an empty map style with no error banner; no live map claim. | F-family |
| G02 | Unauthenticated/pending/missing-token/rejected/error/verified gate | pages/admin/LuonnonmetsakartatAdminGate.test.tsx: `closes incomplete auth`, `waits for verification`, `waits for token resolution`, `never renders a previously verified child`, `rejects an absent user identity`; LuonnonmetsakartatAdminAccess.test.tsx: `closes actual detail settings/pictures links` | rendered/integration | added-and-verified / F100.5.1 | Real auth context, gate, verification query, QueryClient, store and admin pages; auth provider input/HTTP controlled. Transient child layout effects are checked. No live identity-provider claim. | F-family |
| G03 | Admin empty/list/detail | pages/admin/LuonnonmetsakartatAdminPage.test.tsx: `loads verified admin records`; pages/admin/layer/folayer/LuonnonmetsakartatAdminLayerFolayerPage.test.tsx: `loads the actual detail`, `loads the new route ID`, `settles map initialization`, `shows a bounded area-dependency error`, `finishes list area preload across actual detail navigation`, `settles a populated list refresh after list → detail → list → detail navigation under the same gate` | rendered/integration | added-and-verified / F100.5.1 | Actual rows, runtime and SearchTable; upload/toggle/detail/settings/pictures navigation. Thin navigation adapter uses real href resolver and switches list/detail children under the same gate. Deferred area preloads and populated list refreshes finish after navigation, with Idle store/query state and usable detail links. No settings/picture edits or real geometry assertions. | F-family |
| G04 | Settings clean/dirty/saving/error | pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.test.tsx: clean controls, real keyboard color/visibility edits, debounced/immediate name saves, pending guards, server result, failure/retry, timer/loader cleanup and seeded Saving compatibility | rendered/integration | fixed-and-verified / F100.5.2 | Real page, patch hook, QueryClient, stores and notifications; controlled HTTP. Retains replacement suite. No live persistence claim. | F-family |
| G05 | Pictures empty/matched/unmatched/save/error | pages/admin/layer/folayer/pictures/LuonnonmetsakartatAdminLayerFolayerPicturesPage.test.tsx: `maps, changes and clears folders`, `submits the exact changed mapping`, `allows partial saves`, `retains files and manual mapping after failure`, `replaces the directory`; empty/no-area/not-ready cases | rendered/integration | fixed-and-verified / F100.5.3 | Actual page, input, comboboxes, virtual lists, patch hook, scaffold progress, stores and notifications. Repeated IDs/exclusions, pending guards, failure recovery and ordinary reset; no storage claim. | F-family |
| G06 | Area edit UI | components/AreaModalAdmin.test.tsx: `edits store-selected metadata`, `retains the dirty area draft`, `reflects externally removed saved pictures after real area-query refreshes` | rendered/integration | fixed-and-verified / F100.5.3 | Actual editor/gallery, metadata fields, area patch hook, query normalization, stores and notifications. Gallery accepts serialized PATCH pictures. Removal evidence is external refreshed metadata; no saved-picture delete control exists. | F-family |
| G07 | Destructive confirmation | pages/admin/layer/folayer/settings/LuonnonmetsakartatAdminLayerFolayerSettingsPage.test.tsx: keyboard delete, real cancel/reopen/confirm, selected second-layer request, pending Save guard, deferred real map cleanup/navigation, failure with unsaved name/visibility and retry; `does not preload a deleting or removed layer`, `resumes row preloading after a failed deletion`, `does not restart outgoing detail queries when the admin gate changes wrappers before the route outlet commits` | rendered/integration | fixed-and-verified / F100.5.2 + F100.6 | Real dialog/delete hook/applet/UI stores/group ID and map bookkeeping with null WebGL instance. Preserves unrelated records, areas, groups and subscriptions. Retains the actual admin row through deletion and the real gate wrapper/outlet transition: no detail/WFS reads or map recreation while deleting/absent, and preload resumes on failure rollback. No GPU/upstream cleanup claim. | F-family |
| G08 | No retry/remount loops or editing exposure on rejection | pages/admin/LuonnonmetsakartatAdminGate.test.tsx: `settles denial/error`, `ignores obsolete validation`, `ignores an obsolete success after logout`, `bounds StrictMode`, `does not trust stale store verification`, `redirects a rejected nested page`; LuonnonmetsakartatAdminAccess.test.tsx: `revokes private rows`, `does not restore privileged data`, `discards queued %s after revocation`, `discards an admin installation already resolving its style`; LuonnonmetsakartatAdminLayerFolayerPage.test.tsx: `settles a populated list refresh` | rendered/integration | fixed-and-verified / F100.5.1 | Real verification, no seeded status or mocked hook. One deliberate verification per ordinary mount; same-gate return navigation adds no verification or list loop; StrictMode attempts are bounded. Applet-scoped revocation cancels query work/removes privileged data and popup ownership; queued additions recheck hook ownership at execution and after style resolution, with no transient installation. Browser lifecycle: B01–B09. | F-family |
| B01 | Public visible/hidden and auth gates | smoke `public and anonymous admin gate`, `rejected admin gate`, `authorized admin gate/list`, hidden import/public readback | browser | automated / F100.6 | Fresh identities; real validate/list queries, zero protected calls while denied; no scenario bypass | F-browser |
| B02 | Valid import and both duplicate-key failures before POST | smoke two duplicate phases plus `valid ZIP import and fresh hidden-layer readback`; helper real ZIP and all-attempt observer cases | browser/helper | automated / F100.6 | Pair fixture has unique IDs; explicit pair selection; visible validation plus zero requests through route exit; one valid create | F-browser / F-helpers |
| B03 | One created layer: detail/settings/pictures navigation | smoke real detail links, discovered create ID, settings/pictures path assertions | browser | automated / F100.6 | Fresh HTTP detail/WFS plus consuming UI; no fixed seed ID | F-browser |
| B04 | Name/color/visibility save with public readback | smoke `settings name/color/visibility and public persistence` | browser | automated / F100.6 | Real hue keyboard edit; exact submitted fields; reload GET/control readback; fresh anonymous contexts for visible/hidden/visible | F-browser |
| B05 | Area metadata save/readback | smoke `area metadata UI edit and WFS readback` | browser | automated / F100.6 | SearchTable → real editor → area PATCH → fresh WFS → reopened editor; stable ID and unchanged neighbor | F-browser |
| B06 | Picture matching/change/clear/save/readback | smoke `picture matching/change/clear/partial save and gallery readback`; helper native FormData observation | browser/helper | automated / F100.6 | Raw File inputs only; automatic match/unmatched warning/counts/manual assignment/clear; exact file/ID alignment and exclusion; WFS metadata and real gallery; image bytes alone fulfilled | F-browser / F-helpers |
| B07 | Delete, absence, failure cleanup and ownership | smoke `UI delete confirmation and fresh absence`; `--fail-after-import`; helper `uses the runner orchestration`, `continues every owned cleanup`, `aggregates primary`, `recovers an accepted create` | browser/helper | automated / F100.6 | Cancel sends no DELETE; confirm sends one; G07 also covers the post-delete row/query race; authenticated list/detail absence, supplementary public read; exact-name recovery/baseline exclusion; unresolved transport/readback/close errors fail | F-browser / F-failure / F-helpers |
| B08 | Canonical/locales/removed legacy/runtime modes | smoke `canonical/locales/removed legacy routes (live main)`; helper mode/routes; existing R01/R02 matrices | browser/unit | automated / F100.6 | Live available mode only; all four untranslated tails return document 404 and rendered not-found after admin gate verification; other mode construction only | F-browser / F-shared / F-helpers |
| B09 | Repeatability and strict page/console errors | two uninterrupted lifecycle runs; helper strict collectors, exact resource-diagnostic cases, aborted/incomplete creates and independent teardown | browser/helper | automated / F100.6 | No server resets or broad console allowlist; accepted diagnostic rules below; success only after cleanup and resource close | F-browser / F-failure / F-helpers |
| L01 | Real GeoServer/PostGIS ingestion | None in default tests | live | separate live/manual | Opt-in disposable IDs and cleanup | Excluded from defaults |
| L02 | Real replacement reconciliation/deletion | Mock intentionally preserves geometry | live | separate live/manual | Opt-in real backend acceptance | Excluded from defaults |
| L03 | Real object storage and identity provider | Shared tests stub identity transport; mock pictures use deterministic URLs | live | separate live/manual | No live credentials or shared-sandbox writes in defaults | Excluded from defaults |
| H01 | Layer/style/config and map-request auth regressions | common/{constants,geoServer,utils}.test.ts; layers/forestUseDeclarations.test.ts; shared publicGeoServer.test.ts and src/components/Map/mapAuthTransformRequest.test.ts | unit | existing / F100.1 | Applet `common/utils.ts` marks admin vector sources `useAccessToken`, the map store embeds that request metadata, and `MapHandler` installs this transform; the shared suite proves bearer attachment, missing-token stale-source handling, public requests, and configured GeoServer matching | F-family |
| H02 | Fixture/scenario/bootstrap safety | common/mockScenarios/LuonnonmetsakartatMockScenarioBootstrap.test.tsx; shared registry, route guards, visual scenarios/impactMap | helper | existing / F100.1 | Helper lifecycle/production guards are not page rendering | F-family |
| H03 | Focused command, checks, runbook | jest.luonnonmetsakartat.config.ts; exact inventory comparison; final command table below | verification | automated / F100.6 | 35 applet + 24 shared suites; no unrelated applet suites in focused command | F-discovery / F-family / F-types / F-lint |

## Troubleshooting

- Unreachable port, missing flags/bootstrap, wrong mode, missing Chromium/Xvfb or
  WebGL: invoke runtime doctor with the exact no-start command and output. Retry
  after `RETRY_READY`; report a remaining `RUNTIME_BLOCKED` verdict accurately.
  Do not recreate the service from ordinary `.env` defaults.
- A visible validation mismatch, any negative create attempt, wrong submitted
  fields, changed neighbor, failed readback or failed confirmation is a
  deterministic runner/product contract failure. Investigate the named phase
  and its owning test seam; a server reset or a looser assertion cannot fix it.
- Cleanup failure is independent of the primary failure. Retain the run ID,
  exact names/IDs, unresolved-create evidence and all aggregated errors. Hidden
  public absence alone does not establish deletion. Never delete unrelated or
  same-prefix layers to make the next run pass.
- For unexpected console noise, retain its page/phase/source/message and relevant
  response. Only the documented rules above are tolerated. Missing MML key is a
  prerequisite error, not the known upstream socket exception; other MML phases
  or responses remain failures and require diagnosis rather than a blanket filter.
- Missing/changed ZIPs: use the existing fixture generator/manifest and parser
  suite. Do not replace the tiny fixtures with real project data. UI translation
  changes can require selector updates; do not weaken the validation oracle or
  edit downloaded `i18n` JSON to force a pass.
- Generic auth tests failing only inside the app container: use the process-only
  `env -u ...` test command above. It leaves the running browser service intact.

## Final verification — second corrective pass, 2026-09-29

Verified worktree: branch `luonnonmetsakartat`, HEAD
`1e3b353e2f8f2ad97743805092d67dcd8e18858c`, with the uncommitted F100.6
changes. The manager owns the reviewed local commit. Artifacts below are under
`.dev/visual-regression/f1006-correction-20260929/`.
`verified-code.sha256` identifies the tested code, and `verified-source.sha256`
identifies all ten feature files including documentation. Protected file hashes
and unstaged/untracked Git state are preserved; no commit, push or deployment
was performed in this pass.

The earlier preload-only correction was incomplete. The real admin gate changes
its wrapper when the destination pathname becomes the admin landing page, while
the old detail/settings outlet can still be retained. That change remounts the
outgoing detail runtime, whose mount effect enables its layer and restarts detail
and WFS reads after deletion. The new G07 regression reproduces this transition
with the real gate, settings, confirmation, mutation, map/query hooks and retained
row. **Before the runtime fix it made exactly two unwanted GETs**, one detail and
one WFS (`regression-before.log`).

The runtime now checks the current layer's canonical route, built through the
existing app-route helper, before mounting its query/map lifetime. It accepts
that layer's detail/settings/pictures subtree and does not mount an outgoing
layer after navigation has left it. The earlier present/non-Deleting row-preload
guard remains necessary. Failure rollback still resumes preloading. No shared
navigation API, route policy, server store, timing delay or diagnostic exception
changed. Existing detail/auth tests now supply their actual detail pathname
alongside the route parameter; the empty-area navigation test awaits React's
queued table update with async `act`. Their assertions remain intact.

| Evidence key | Exact command or selection above | Final result | Artifact |
| --- | --- | --- | --- |
| F-discovery | `yarn test:luonnonmetsakartat --listTests --json` | Exit 0; 35 applet + 24 shared = 59 suites, exact filesystem/config set equality | `discovery.json`, `discovery-audit.json` |
| F-family | `yarn test:luonnonmetsakartat` | Exit 0; **59 suites / 1,122 tests**, no snapshots | `focused-jest.log`, `focused-jest.exit` |
| F-helpers | Focused smoke-helper `--runTestsByPath` command | Exit 0; **1 suite / 42 tests** | `helpers-jest.log` |
| F-shared | Explicit 13-path routing/auth/proxy/build selection above | Exit 0; **13 suites / 372 tests** | `shared-jest.log` |
| F-types | `yarn start:typecheck`; explicit test-tsconfig command above | Both exit 0; app and all three changed TS tests plus their imports checked, no diagnostics | `typecheck.log`, `test-typecheck.log`, `test-tsconfig.json` |
| F-lint | Explicit eight-file ESLint command; `yarn lint`; `git diff --check` | Exit 0; changed files clean; full lint **0 errors / 296 existing warnings** outside changed files | `changed-lint.log`, `full-lint.log`, `diff-check.log` |
| F-visual | No-start two-path `visual:after-edit` command above | Exit 0; **30/30** desktop/mobile comparisons, zero differing pixels; no baseline changes | `visual-after.log`, `visual-report.json`, `visual-current/` |
| F-delete | G07 page regressions plus observation-only tracing of the same runner | Trace exit 0; all 11 phases; **zero post-DELETE detail/WFS requests for the deleted ID** | `regression-before.log`, `affected-jest.log`, `smoke-traced.log`, `deletion-after.json`, `live-artifacts/context-2.zip` |
| F-browser | Packaged no-start command twice consecutively | Both exit 0; all 11 phases, live main, one create each, baseline 3 preserved, cleanup verified | `smoke-repeat-1.log`, `smoke-repeat-2.log`, matching `.exit` files |
| F-failure | Same runner with `--fail-after-import`, followed by ordinary command | Expected exit **1**, deliberate primary failure only, verified owned cleanup; subsequent ordinary run exit 0 | `smoke-injected.log`, `smoke-after-injection.log`, matching `.exit` files |

The baseline passed 59 suites / 1,121 tests. The new gate-transition regression
failed before the production fix, then passed with the affected settings,
gate, access and deletion selection (4 suites / 63 tests, `affected-jest.log`).
Final full-suite verification includes it, the existing rollback regression and
the unchanged cleanup-failure/strict-diagnostic helper cases.
Intermediate failures are retained: `focused-before-route-fixtures.log` records
five existing detail fixtures with inconsistent URL/params;
`focused-before-async-act.log` records the empty-table navigation's unawaited
React microtask. Corrected detail tests passed 7/7 (`detail-jest.log`) before
the final complete focused run. No console guard, timeout or behavioral assertion
was relaxed. Intentional HTTP-negative tests still emit their expected logs.

Trace command (the ordinary packaged command needs no preload):

```bash
docker compose -f /workspace/project/docker-compose.dev.yml --project-directory /workspace/project exec -T app sh -lc 'cd /app && NODE_OPTIONS="--require=/app/.dev/visual-regression/f1006-correction-20260929/capture.cjs" yarn luonnonmetsakartat:mock:smoke'
```

The copied observation-only preload records Playwright traces/screenshots and
request/response metadata. It adds no actions, fulfills no API requests and
changes no assertions. `deletion-after.json` retains the DELETE 200 at
`2026-09-29T13:53:48.876Z` and an empty `postDeleteDetailOrWfs` list. Inspected
trace frames `settings-before-delete.jpg` and `admin-after-delete.jpg` show the
settings surface and remaining baseline rows. Dialog controls and actions are
also recorded in the trace snapshots and `trace-actions.json`.

| Run | Run ID | Discovered layer | Result |
| --- | --- | --- | --- |
| Traced lifecycle | `1790689923478-63880152-f261-46cd-98db-fdf1af363146` | `mock-created-layer-1` | Exit 0; zero post-delete reads, verified cleanup |
| Consecutive ordinary 1 | `1790690062828-8cf506a2-ef5b-406f-953c-b7d4e29ac062` | `mock-created-layer-2` | Exit 0; all 11 phases, verified cleanup |
| Consecutive ordinary 2 | `1790690167755-e11b4848-7907-4983-8883-2a9bd9d32bbc` | `mock-created-layer-3` | Exit 0; all 11 phases, verified cleanup |
| Injected post-import failure | `1790690286566-98f7da7d-eb71-42e6-b398-7c8696bdb306` | `mock-created-layer-4` | Expected exit 1; deliberate failure only, verified cleanup |
| Ordinary after failure | `1790690345736-305396f8-0c98-4075-9151-62493334d00c` | `mock-created-layer-5` | Exit 0; all 11 phases, verified cleanup |

All cleanup results have empty unresolved IDs/creates. Every ordinary run
preserved the three authenticated baseline records. IDs above are observations,
never runner constants. `browser-summary.json` retains their complete outputs.
The two consecutive commands had no intervening source/configuration changes,
reset or restart. Source/HMR iterations preceding this sequence are excluded
from repeatability evidence. Test-fixture corrections later in the pass did
not alter production or runner code.

Runtime doctor run
`20260929-134704-636929-runtime_doctor-F100.6-luonnonmetsakartat-lifecycle-smoke-runbook`
exited 0 with `RETRY_READY`; its `exit.json` and report were read and copied here.
It changed no service/configuration/data. Its diagnostic smoke is not counted
as this pass's feature verification. The container identity before/after remains
`78f8360d3576e2d23b26e537a790395ffca2ad1a9f99ac4d6440c694f872cf8e`,
started `2026-09-29T11:31:15.972700639Z`, restart count 0
(`container-before.txt`, `container-repeat-after.txt`, `container-after.txt`).

Every successful lifecycle logged only the seven documented intentional
resource diagnostics: three admin-validation 403s and four legacy-document
404s. No run in this corrective sequence required the MML exception. Historical
MML failures and the review's post-delete failure remain failures; later passes
do not reinterpret them. The deterministic regression and corrected live trace
supply the deletion repair evidence. **Live mode: main.** Standalone has
construction coverage only. No real-stack acceptance is claimed.

The 56-row ledger reconciles the processed F100 request, parent architecture
and direct child specs under the manager's 2026-09-29 scope clarification.
L01–L03 remain the concrete external boundaries. The provenance statement
certifies no unseen local-plan document and leaves no known frontend-owned row
as an unresolved manual exemption.
