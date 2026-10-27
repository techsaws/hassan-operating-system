# Find Leads — source assessment and scope

Open `/opportunities`, click **Find Leads**, choose a campaign, service, company country, buyer category and optional keywords, then **Discover public opportunities**. No company names, contacts or websites are required.

## Sources assessed before implementation (2026-10-28)

| Source                                                                 | Actual access / quota conditions                                                                                                                                                                                                                                                                           | Decision                                                                                                        |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| [HN Search by Algolia](https://hn.algolia.com/api)                     | Published public JSON API; no key, account or paid plan needed. Documented limit: 10,000 requests/IP/hour. [Dedicated freelance threads](https://news.ycombinator.com/item?id=49922572) explicitly permit people looking to hire freelancers.                                                              | Selected for a narrow, buyer-only discovery MVP. Sparse, technical audience; not a US small-business directory. |
| [Freelancer API](https://www.freelancer.com/about/apiterms)            | Licensed developer API with application/account integration. Terms limit caching to performance use, require refresh at least every 24 hours, and restrict copying/storage. A dependable published anonymous-access quota was not established; no rate was invented and no API restrictions were bypassed. | Not integrated: persistent research storage and app access need further terms/credential work.                  |
| [Remotive public API](https://github.com/remotive-com/remote-jobs-api) | Free public JSON; attribution/link-back required; postings delayed 24 hours. Recommended maximum four fetches/day; more than two/minute blocked. Candidate location is not buyer/company country.                                                                                                          | Not integrated: predominantly employment roles, not direct small project buying requests.                       |

HN is a limited starting source, not a claim that a rich buyer pipeline exists. If it finds no relevant buyers, the app says so and provides campaign-specific search-engine links for **manual** research. Search pages are never fetched or scraped.

## Discovery rules

- Use only the fixed `https://hn.algolia.com/api/v1/` API. Up to three distinct monthly freelance threads from the last 90 days, at most two pages of 100 comments per thread; no arbitrary website fetching or background workers.
- Explicit original `SEEKING FREELANCER` posts are buyer candidates. `SEEKING WORK/FREELANCE` ads, replies, unrelated discussions, employment-only requests, unpaid work and ordinary open-source issues are not treated as paid opportunities. Classification is a conservative heuristic, not verified intent or a budget guarantee.
- Service/keyword filters are applied to the source text. Unknown geography and company size are labelled. Optional inclusion of unknowns never confirms US/SMB eligibility. Only explicit company location/type statements count as evidence; applicant location restrictions and customer segments do not establish buyer location/size.
- Company identity is populated only from an explicit company line. No inference from usernames, email domains or example portfolio links. Contact routes are taken only from explicit buyer-provided contact/application instructions; no harvesting of freelancer advertisements and no independent contact verification.
- Recent publication means availability is **unconfirmed**. Recognized closure, filled/cancelled language, ISO application deadlines and age over 45 days mark closed/expired/stale requests. Those cannot be saved as actionable discovery findings. Unrecognized closure or deadlines require reading the original.
- API requests use HTTPS, no redirects, a 30-second overall search deadline and 2 MiB response limits. API errors/429 are failures, not invented results. Per-process cooldowns: 30 seconds between searches and two seconds between save attempts. A run uses at most seven API calls, and a new save uses two. Cooldowns are best-effort within this single-user process, not distributed quota enforcement.
- Saving refreshes the original comment and confirms its parent thread before accepting it. Clients cannot supply trusted excerpts, company identity, status or timestamps. Save only selected findings; source URL deduplication preserves existing manual research. No automatic CRM lead or message is created.
- Saved source metadata/excerpts feed the existing opportunity research, Qwen analysis, CRM handoff and draft editor. Operator assertion fields stay blank until reviewed. Changing the source URL clears the old discovery provenance.
- [HN guidelines](https://news.ycombinator.com/newsguidelines.html) prohibit generated/AI-edited comments and automated posting. Do not paste AI outreach into HN comments. Follow a buyer's application instructions and communicate manually and appropriately.

## Live business-value check

Run on 2026-10-28 (Asia/Karachi), using automation / United States / small business, unknowns included, no prospect identifiers or extra keywords.

- Scanned all **61** returned comments in the three selected August–October threads: **59 seller/irrelevant**, **2 informational**, **0 explicit buyer requests**, **0 uncertain opportunities**.
- Relevant requests: **0**. Identifiable buyer companies: **0**. Buyer-provided public contact routes: **0**. Opportunities realistically worth pursuing from this run: **0**.
- There are **no useful buyer URLs to present**. These are the inspected thread URLs, not prospects: [October](https://news.ycombinator.com/item?id=49922572), [September](https://news.ycombinator.com/item?id=49522905), [August](https://news.ycombinator.com/item?id=49157021).
- The API worked, but this test did **not** establish a commercially useful pipeline. Use the manual search links or another source assessment rather than contacting sellers or inventing buyer facts. No live result dataset or contact list is committed.

To repeat the bounded live check deliberately:

```powershell
node --conditions=react-server --import tsx scripts/live-discovery.ts
```

Automated tests use synthetic API fixtures. The live script reports counts and source links, never saves results. The UI permits review and selective saving when a genuine request appears.
