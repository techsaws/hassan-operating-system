# Acquisition expansion (Milestone 009)

Use `/acquisition` to discover without knowing prospect names. Pick an Agency is the default: discover, review the source assertions and missing facts, select a suitable record, then save. Saving creates or reuses agency research in the existing opportunity worklist and the default **Agency Partnerships — Engineering** campaign. It does not create a CRM lead. Existing research, Qwen analysis and reviewed drafts remain available from that worklist.

Choose Remote OK for the complementary job feed. Review geography, arrangements and application instructions before saving to the job pipeline. No applications or messages are sent. Remote OK postings cannot be saved as client sales or partnerships.

## Sources assessed

- **Pick an Agency:** [developer documentation](https://www.pickanagency.com/developers) and [OpenAPI](https://www.pickanagency.com/api/v1/openapi.json). Public search, no key or billing; CC BY 4.0 with attribution/link-back. Selected because it returns agency identity, website, services, location and source-reported size. The MVP requests ten US web-development agencies, not an unbounded directory crawl. No explicit retention deadline was advertised in the assessed documentation; saved evidence retains provenance and credit. No company-site crawl runs automatically.
- **Wikidata:** [data access](https://www.wikidata.org/wiki/Wikidata:Data_access), reusable CC0 knowledge-base data. Not selected: agency-specific service/size coverage was more directly available from the chosen API. No live Wikidata cohort was queried.
- **Remote OK:** [public API and inline usage notice](https://remoteok.com/api). No credentials/billing required in the tested access. Requires visible Remote OK attribution and a follow link to the original listing; no logo is used. A formal quota was not established, so the application sets conservative limits below. Empty location and digital-nomad tags never establish worldwide or Pakistan eligibility.
- **Jobicy:** [documented public API alternative](https://github.com/Jobicy/remote-jobs-api), assessed as an alternative only; no live cohort fetched and no integration added after Remote OK worked.

Both new providers use six-hour ignored local caches, at most four network attempts per rolling 24 hours, a one-minute retry interval, fixed HTTPS API endpoints, redirects disabled, a 30-second timeout, JSON/schema validation and a 4 MiB body limit. Failed attempts consume the local budget. These are application limits, not claimed provider quotas. Source failures remain errors, never fabricated empty successes. A shared 30-second discovery cooldown still applies.

## Live verification, 28 October 2026

| Source | Retrieved | Relevant | Organizations | Published routes | Explicit demand | PK confirmed | Eligibility unknown | Duplicates | Worth research/review |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Pick an Agency | 10 | 10 | 10 | 10 | 0 | 0 | 10 | 0 | 9 |
| Remote OK | 99 | 20 | 90 | 98 | 20 | 0 | 60 | 1 | 10 |
| Overture | 20 | 20 | 20 | 17 | 0 | 0 | 20 | 0 | 20 |
| HN | 61 | 2 | 0 | 0 | 0 | 0 | 61 | 0 | 0 |
| Remotive | 11 | 5 | 8 | 11 | 5 | 0 | 9 | 0 | 3 |

All five returned successfully; Remote OK and Remotive reused same-day API caches. Counts are a bounded snapshot, not a revenue claim. Remote OK's legal metadata entry is excluded from its 99 jobs; one confirmed cross-source opening is removed before remaining-result metrics. Route counts include original job-board application routes and directory-listed websites. They do not mean verified partnership permission or a verified direct decision-maker. Explicit job demand means a relevant published hiring posting, not confirmed availability or suitability for Hassan. Worth reviewing is a deterministic triage flag, not an endorsement. Organizations/routes may include irrelevant findings.

One agency's tagline contradicted its apparent agency identity; the record is flagged and cannot be saved. Directory founding dates, ratings and project-minimum budgets are not used as buyer evidence. Leadership, partnership routes and subcontracting demand remain unknown until independently researched. The live sample established **zero documented agency partnership requests** and **zero explicitly Pakistan-eligible jobs**.

## Identity, preservation and limitations

New providers reuse existing acquisition entities, findings, runs, campaigns and opportunity research. No schema migration, new dependency or independent CRM system is required. Only selected records persist. Existing operator evidence is not overwritten by repeated saves.

Cross-board opening deduplication requires the same explicitly published application target, normalized employer and role title. It compares selected jobs and a recent cached Remotive feed without triggering another fetch. Missing/shared generic links do not justify merging; unresolved duplicates remain for review. Selected-job comparison is bounded to 500 records. Provider identity and record-specific URLs retain the previous deduplication rules.

The agency cohort is small and directory-reported, not a verified buyer list. No leadership/contact enrichment crawler was added. Use the existing research workflow to check official team and partnership pages, record exact evidence, establish a legitimate route and only then prepare an approach. For jobs, verify location, authorization, role status and fit with the employer before any manual application. No income or paying-client outcome has been established.

Raw feeds, named research records and screenshots stay in ignored `.local-research/` or Neon, not public Git. Tests use synthetic fixtures. Existing source access limitations and setup in [acquisition](acquisition.md) and [business prospecting](business-prospecting.md) still apply.
