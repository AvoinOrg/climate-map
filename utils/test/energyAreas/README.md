# Isolated Energy area fixtures

Usage, exact exported seams, scenarios and provenance are documented in
[the frontend area contract](../../../docs/energy-area-api-contract.md).

- `dataset.json`: three canonical release snapshots, full and scoped detail,
  structured empty metrics and synthetic geometry.
- `provenance.json`: checksums of the inspected read-only service implementation.
- `manifest.json` / `tiles/**/*.pbf`: representative XYZ/TMS coordinate samples.
- `responder.cjs`: explicitly installed Node fetch/API/tile responder and gates.
- `playwright.mjs`: route installer using the same responder and binary bodies.
- `generate-data.cjs`, `generate-tiles.mjs`, `tiles.mjs`: reproducible offline
  authoring and real polygon tiling (no backend execution).
- `verify.mjs`: independent codec/geometry/API/adapter/isolation checks.
- `mapMock.ts`: shared MapLibre test double used with the real map/selection
  stores and area owner in lifecycle and navigation integration tests.
- `buildings.mjs`: explicitly intercepted synthetic building MVT/certificate
  responses for the actual-map return-to-Buildings and local Water-edit check.
  It uses the existing building source contract and is never an app fallback.

There is no product import or fallback. Fixture origins are reserved test data,
not a proposed deployment. Runtime configuration/lifecycle changes for later
browser checks belong to runtime doctor; use the existing runtime with `--no-start`.
