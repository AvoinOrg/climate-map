# Energy latest-area fixtures

Explicit test-only synthetic data and real binary MVTs. Application code never
imports this folder. `releaseIds`/`snapshotId` are private fixture-controller
identifiers, retained to minimize churn in the original evidence; they are absent
from API responses, stable tile properties, source IDs and public request URLs.

`createEnergyAreaFixture().setActiveRelease(id)` switches the current synthetic
snapshot. Normal requests always read that snapshot at dispatch. Gates,
`ignoreAbort`, transforms, HTTP and network errors exercise obsolete requests.
The responder rejects version query parameters and intercepts only its test API
origin and the exact three sandbox stable GeoServer TMS area paths. Optional
metadata does not supply the application's rendering descriptors.

Regenerate offline with `node utils/test/energyAreas/generate-data.cjs` and
`node utils/test/energyAreas/generate-tiles.mjs`; no backend mount or execution is
needed. Historical backend hash evidence is retained under
`provenance.json.historicalServiceEvidence`, without claiming current backend
provenance. The named latest contract and synthetic authoring are the current
basis. Recorded XYZ coordinates are decoder evidence for the same synthetic
geometry; product delivery is stable TMS only.

Run `node utils/test/energyAreas/verify.mjs` for independent binary decoding,
identity/count/coverage/name/scope oracles, adjacent clipped fragments, exact
stable routes, private snapshot switching and browser-adapter isolation. Use the
existing `energy-area-modes-smoke.mjs --no-start` actual-map runner for FI/EN
 desktop/mobile controls, wheel/pinch, detail/Back/building interactions, refresh
and style checks. `--national` runs a separate unmocked acceptance path. Pass a
unique `--output=` for each run. Runtime setup/recovery is delegated to
`runtime_doctor` and live checks reuse its verified server.
