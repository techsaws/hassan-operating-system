# Milestone 006: prospect coverage, not buying intent

## Phase A (two sources assessed)

1. **Overture Places — selected.** [Official access guide](https://docs.overturemaps.org/guides/places/) and [official Python reader](https://docs.overturemaps.org/getting-data/overturemaps-py/). Public cloud GeoParquet, anonymous reads, no account, billing or paid credentials. Names, US address fields, category, websites, phones and provider provenance are available, not always complete/current. Storage/reuse permitted under the applicable [provider licences](https://docs.overturemaps.org/attribution/): CDLA Permissive 2.0, Apache 2.0 and CC0. Preserve attribution and licence notices when redistributing; CDLA requires its text with shared data. No prospect data is distributed in this repository. No fixed read quota was established from these docs; do not claim unlimited service or guaranteed uptime.
2. **OpenStreetMap / public Overpass — not selected.** [ODbL](https://www.openstreetmap.org/copyright) permits storage/commercial reuse with attribution and applicable share-alike obligations. Business tags can include websites/phones; coverage varies. The [public instance policy](https://dev.overpass-api.de/overpass-doc/en/preface/commons.html) cautions against applications relying on shared instances as a backend. No Overpass cohort requests were made. No key/billing is needed for small public queries, but that does not establish a sustainable application backend. No third source needed.

## Phase B: actual bounded cohort, 28 October 2026 (Pakistan)

Read release `2026-10-21.0` with the official reader, anonymous S3 and STAC index. Bounding box west/south/east/north: `-78.85,35.65,-78.45,35.95` (Raleigh/Apex area). First 20 trade-related records in source traversal order, not a representative or ranked sample. Initial broad category matching also included an electrical supply store; production uses exact `hvac_service`, `plumbing`, `electrician` tags to exclude that noise. Industrial contractors/chains can still occur. Monthly release freshness does not imply that individual source records are recent.

- 20 named US catalogue records identified; 17 had source-listed websites and all 20 had source-listed phones. These fields alone are not independent verification.
- 10 official websites corroborated by page identity/location/service information; eight relevant home-service businesses had corroborated public contact routes. Two additional verified sites were a multi-market electrical contractor and an industrial specialist, not confirmed small home-service targets.
- Seven supplied website URLs could not be verified through the research browser (access errors/timeouts); three records supplied no website. Failure to fetch is not proof the business/site is closed.
- Eight relevant public contact routes were verified as published on official pages, not tested for delivery. No calls, emails, form submissions or outreach occurred. Company size/decision-maker eligibility remains unverified except where self-described on source pages.
- **Documented automation problems: 0. Explicit buying requests: 0.** Scheduling/service-request workflows are observable, but this does not prove a broken process, unmet automation need, budget or intent to hire Hassan.
- Coverage threshold (five businesses / three contact routes) passed. Paid-demand/commercial validation did not.

The full cohort, per-business verification URLs and research questions stay in ignored `.local-research/validation.md`, not public Git. Actual prospect links are supplied in the operator handoff. Discovery never saves a cohort automatically.

## Phase C: smallest integration

Existing `/opportunities` has a separate **Find Businesses** option alongside HN. Choose campaign, one of three fixed US bounding boxes (Raleigh/Apex, Austin, Tampa), and trade. No company name required. The tested area is Raleigh/Apex; other areas are supported but not independently coverage-validated. Proposed service is automation. The UI distinguishes catalogue assertions, unknown needs and operator research questions. No scores or positive buying signals are invented.

Optional Python reader setup is in README. Exact-version requirement: `overturemaps==1.0.2`. This is a data-format reader, not an agent/runtime service. Next invokes a fixed local script with enumerated args, no shell, stripped environment (no database/AI credentials), a two-minute process timeout and 512 KiB output cap. The reader uses the official STAC/latest release and anonymous cloud access; max 20 results / 100,000 scanned local-area rows. Request timeouts are 10/25 seconds; an official-reader failure remains an error. One user-triggered run per minute; no background fetches, search scraping, paid APIs or automated business website fetching.

Three in-memory result snapshots maximum; ten-minute save window; restart or expiry requires another discovery. Save accepts only server-cached IDs/tokens, never client evidence. Saved catalogue evidence includes GERS ID, release, provider/licence/update provenance, source-listed sites/phones and explicit unknowns. Save deduplicates by GERS-bearing platform field or normalized website (HTTP/HTTPS and www variants); PostgreSQL advisory locking protects repeated same-GERS saves. Existing opportunity records/manual evidence are preserved. Different IDs without shared websites may remain duplicates. No schema migration, CRM auto-creation, AI invocation or sending. Need/operator evidence and explicit-request fields remain empty/false until reviewed.

Open saved research, verify official contact ownership and an actual operational need, then use existing Qwen analysis, CRM handoff and draft review. Treat public customer booking forms as customer-service routes, not permission for unsolicited sales messages. Do not impersonate a customer. Any future shared dataset export must carry applicable licence/attribution; prospect records remain local/Neon.

## Verification

Live official-reader query and application discovery; synthetic unit tests for bounded inputs, unsafe URLs, expired/forged snapshots, closed status and source failure; real Neon transaction tests for selected-save provenance, blank assertions, website aliases, concurrent GERS deduplication and preservation of manual evidence. Existing CRM/draft regressions retained. No live prospect was automatically promoted or messaged.
