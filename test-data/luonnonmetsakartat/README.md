# Luonnonmetsakartat Upload Fixtures

These ZIP files are small WGS84 polygon shapefile fixtures for the
Luonnonmetsakartat mock browser smoke.

## Files

- `valid-layer.zip`: valid import fixture with two unique feature IDs.
- `duplicate-id-layer.zip`: valid shapefile structure with duplicate `id`
  values, intended to trigger client-side duplicate-ID validation.
- `duplicate-name-municipality-layer.zip`: duplicate `nimi` + `kunta` pairs
  with distinct IDs; select `name_municipality` explicitly.
- `finnish-layer.zip`: valid UTF-8 Finnish names and municipalities.
- `mojibake-layer.zip`: deliberately damaged-looking text stored as valid UTF-8.
- `create-fixtures.js`: deterministic generator for refreshing the committed
  ZIP files.

Each ZIP contains `.shp`, `.shx`, `.dbf`, `.prj`, and `.cpg` entries. The
geometry CRS is WGS84 (`EPSG:4326`). Coordinates are tiny deterministic polygons
near Uusimaa and are only meant for parsing/import validation.

## Columns

The DBF columns intentionally match the current import auto-detection
candidates:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | text | Unique feature identifier for the default `id` indexing strategy. |
| `nimi` | text | Forest-area name. |
| `kunta` | text | Municipality. |
| `maakunta` | text | Region. |
| `kuvaus` | text | Description. |
| `pinta_ala` | number | Area value. The name is intentional because current area-column detection accepts partial matches for `ala`, `area`, and `pinta`. |

## Rows

`valid-layer.zip`:

| id | nimi | kunta | maakunta | kuvaus | pinta_ala |
| --- | --- | --- | --- | --- | --- |
| `lm-valid-1` | `Smoke Ridge Forest` | `Espoo` | `Uusimaa` | `Valid smoke fixture area 1` | `1.25` |
| `lm-valid-2` | `Smoke Lakeside Grove` | `Lohja` | `Uusimaa` | `Valid smoke fixture area 2` | `2.50` |

Expected behavior: the import UI should parse the ZIP, auto-detect all listed
columns, allow a layer name to be entered, POST to
`/api/luonnonmetsakartat/layer`, and redirect to the created layer route.

`duplicate-id-layer.zip`:

| id | nimi | kunta | maakunta | kuvaus | pinta_ala |
| --- | --- | --- | --- | --- | --- |
| `lm-duplicate-1` | `Duplicate Ridge Forest` | `Espoo` | `Uusimaa` | `Duplicate smoke fixture area 1` | `1.75` |
| `lm-duplicate-1` | `Duplicate Lakeside Grove` | `Lohja` | `Uusimaa` | `Duplicate smoke fixture area 2` | `2.25` |

Expected behavior: with the default `id` indexing strategy, the import UI should
reject the upload before create, stay on the import route, and report duplicate
IDs. **Zero create POST attempts** are allowed, including rejected, failed and
aborted requests. The visible duplicate notification and remaining import route
are the completion oracle; absence of a 201 during a delay is insufficient.

`duplicate-name-municipality-layer.zip` reuses the valid fixture geometry and
all other fields. Its two distinct IDs remain `lm-valid-1` and `lm-valid-2`;
both rows have `nimi = Shared Forest`, `kunta = Espoo`. It parses successfully,
blocks `name_municipality` indexing with `Shared Forest - Espoo`, and passes
`id` indexing. The lifecycle smoke selects pair indexing, observes that specific duplicate
notification, and requires zero create POST attempts through route exit.
Conversely, the duplicate-ID fixture passes pair indexing because its pairs differ.

`finnish-layer.zip` reuses the valid fixture except for names `Mäntymäki` and
`Öljymäki` and municipality `Hämeenlinna` in both rows. It contains correctly
encoded UTF-8 text and passes either indexing strategy.

`mojibake-layer.zip` reuses the valid fixture except for the first name,
`MÃ¤ntymäki`. These are deliberate mojibake characters stored as **valid UTF-8**,
not invalid byte sequences or a CPG mismatch. Pair indexing blocks it; ID
indexing asks for confirmation. Cancellation must not create or replace a layer.

## Regeneration and determinism

```sh
node test-data/luonnonmetsakartat/create-fixtures.js
# Optional isolated output, also used by tests:
node test-data/luonnonmetsakartat/create-fixtures.js /tmp/lm-fixtures
```

Requiring the generator has no filesystem side effects. `buildFixture`,
`generateFixtures`, `fixtures`, and `fields` are the small reusable test seams.
All five archives contain exactly two polygons. Character field widths are
32/64/32/32/80 bytes in column order; `pinta_ala` is numeric, width 10 with two
decimals. DBF date is fixed to 2026-01-01; CPG declares UTF-8. ZIP entry date is
fixed to the original calendar timestamp 2026-07-01 19:05:52, with fixed file
attributes and sorted names. Regeneration preserves both original ZIPs
byte-for-byte; no geometry or row changes were needed. All archives are under
2 KB. The generator now writes actual UTF-8 rather than truncating non-ASCII
characters to ASCII.

`common/folayerShapefile.test.ts` generates twice into fresh temporary folders,
runs the CLI in another timezone and compares bytes against every committed
archive. Default tests never overwrite the committed ZIPs.

## Parsing and validation limits

Tests derive missing parts and damaged archives in memory. With shpjs 4.0.4:
missing SHP, malformed/truncated ZIP and truncated SHP/DBF reject; missing DBF
parses geometry with no usable required columns. Missing SHX, PRJ or CPG still
parses this ASCII, already-WGS84 fixture. This does not prove arbitrary projection
or encoding correctness and does not establish backend sidecar requirements.
An additional in-memory DBF variant contains invalid UTF-8 bytes `C3 28`, decoded
to `�(` and rejected as unsupported text. No universal unknown-CPG rejection
or comprehensive encoding detection is asserted.

Required selected columns must exist: name and municipality in both strategies,
plus ID for ID indexing. Region, description and area are optional. The existing
string validator allows ASCII letters/digits, Finnish åäöÅÄÖ, whitespace and
hyphen; literal `Ã` also marks suspected encoding damage. Pair indexing blocks
identity text problems; ID indexing warns for name/municipality/region. Region
is not identity in pair mode. Description and area values are not validated.

Blank/whitespace, null/missing and non-string values inside present columns are
not independently rejected by current frontend policy. IDs are compared as
strings without trimming/case folding; zero counts, null/undefined are skipped,
and repeated empty strings collide. This is an explicit frontend limitation,
not a backend acceptance promise. Pair matching is case-sensitive and skips
falsy members. It compares the tuple independently of the display separator.

Mock create/update accepts ZIP bytes without backend geometry ingestion.
Replacement preserve/delete tests prove the selected flag and mutation handoff,
not PostGIS/GeoServer reconciliation. Real ingestion, matching, projection,
preserve/delete effects and cleanup remain separate opt-in live acceptance.
Never substitute the large project-memory archive for these tiny fixtures.

## Browser lifecycle input and readback

See [the mock browser runbook](../../agents/luonnonmetsakartat-mock-browser.md)
for prerequisites, the focused Jest command and the no-start lifecycle command.
The lifecycle uses all three import/duplicate archives above without modifying
them. It submits a unique run name, discovers the server's ID, and cleans only
that invocation's layers even after an assertion failure. `mockReset` does not
reset server memory.

Do not expect `lm-valid-*` area IDs or fixture polygons in the mock readback:
the mock does not ingest the ZIP. The runner discovers its synthetic area IDs
from the real authorized frontend WFS request and uses them for metadata and
pictures. Picture input consists of tiny PNG File objects, with ordinary
`webkitRelativePath` and an input change event: two files in a folder named
`<municipality>, <name>` and one deliberately unmatched file. No successful
mapping or stored result is seeded. The real controls match, change and clear
mapping before a partial save; filenames and target IDs are observed at native
XHR.send(FormData) and correlated with real network requests. Only confirmed
owned placeholder image URLs are fulfilled for gallery display. No object
storage bytes or real geometry/identity service are verified.
