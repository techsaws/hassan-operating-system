export const sourceCategories = [
  "Business directories",
  "Communities",
  "Video and comments",
  "Hiring and projects",
  "B2B databases",
  "News and signals",
  "Remote jobs",
  "Developer ecosystem",
  "Official websites",
] as const;
export const sourceRegistry = [
  {
    id: "agencies",
    name: "Pick an Agency",
    category: "Business directories",
    method: "Documented agency search JSON API",
    status: "available",
    credentials: "None",
    setup:
      "Ready. Bounded US Web Development cohort, no company names required.",
    terms: "https://www.pickanagency.com/developers",
    usage:
      "CC BY 4.0; credit Pick an Agency and link back. Cache six hours; app caps at four network attempts/day and one-minute retries, well below the documented few-requests/second ceiling. No source dataset in public Git. Directory assertions can be wrong; listings/services are not partnership demand.",
  },
  {
    id: "remoteok",
    name: "Remote OK",
    category: "Remote jobs",
    method: "Public JSON jobs API with embedded API terms",
    status: "available",
    credentials: "None",
    setup:
      "Ready. Latest bounded feed, local engineering/geography checks and strict cross-source duplicate evidence.",
    terms: "https://remoteok.com/api",
    usage:
      "Mention Remote OK and retain a follow link to its listing (no nofollow). No Remote OK logo. No fixed provider quota established; app caches six hours, max four network attempts/day and minimum one-minute retry. Selected snapshots stay private; verify vacancy/location and employer application path manually.",
  },
  {
    id: "overture",
    name: "Overture Places",
    category: "Business directories",
    method: "Official local Python reader / anonymous public cloud data",
    status: "available",
    credentials: "None. Optional Python package setup required.",
    setup:
      "python -m pip install --target .local-research/python -r scripts/requirements-business.txt",
    terms: "https://docs.overturemaps.org/attribution/",
    usage:
      "Open Places data. Preserve provider licences/attribution for redistribution; no dataset in public Git. Source assertions and stale records require review.",
  },
  {
    id: "hn",
    name: "HN freelance requests / Algolia",
    category: "Communities",
    method: "Dedicated monthly freelance-thread public JSON API",
    status: "available",
    credentials: "None",
    setup: "Ready. Existing adapter; explicit operator-triggered runs only.",
    terms: "https://hn.algolia.com/api",
    usage:
      "10,000 requests/IP/hour documented. App limits run frequency and scope. No automated HN posts; HN forbids AI-generated comments. Selected evidence stays local/Neon.",
  },
  {
    id: "remotive",
    name: "Remotive",
    category: "Remote jobs",
    method: "Documented free public remote-jobs JSON API",
    status: "available",
    credentials: "None",
    setup:
      "Ready. Engineering feed is locally filtered; public feed is small and delayed.",
    terms: "https://github.com/remotive-com/remote-jobs-api",
    usage:
      "Attribute Remotive and link to its listing. 24-hour feed delay. Cache six hours; max four network attempts per rolling day in this app. No redistribution to other job boards or gated signup/email collection. Refresh/recheck active listings before applying.",
  },
  {
    id: "official_websites",
    name: "Official company pages",
    category: "Official websites",
    method: "Existing explicitly requested single-page research",
    status: "available",
    credentials: "None for supported public pages",
    setup:
      "Use saved opportunity source/contact research. No bulk crawl or automatic contact discovery.",
    terms: "https://www.robotstxt.org/robotstxt.html",
    usage:
      "Robots alone is not permission. Operator checks site terms; existing restrictions, SSRF, time/type/size limits apply. Manual evidence remains operator-labelled. Saved records are private.",
  },
  {
    id: "google_places",
    name: "Google Places / other listings",
    category: "Business directories",
    method: "Future approved API only",
    status: "setup_required",
    credentials:
      "Provider account/key; billing/access conditions must be assessed before any work.",
    setup:
      "Not implemented. No purchases or scraping. Validate free access, terms and retention first.",
    terms:
      "https://developers.google.com/maps/documentation/places/web-service/policies",
    usage:
      "Not connected. Provider-specific storage/attribution restrictions require review; no data collected.",
  },
  {
    id: "reddit",
    name: "Reddit / forums",
    category: "Communities",
    method: "Future permitted API / source-specific access",
    status: "restricted",
    credentials: "Approved access as required by the platform",
    setup:
      "Not implemented. Do not automate platform access without approval and validated terms.",
    terms: "https://redditinc.com/policies/data-api-terms",
    usage:
      "Access, quotas and retention not approved for this application; no collection or scraping.",
  },
  {
    id: "youtube",
    name: "YouTube",
    category: "Video and comments",
    method: "Future official Data API",
    status: "setup_required",
    credentials: "Project/API key and quota review",
    setup:
      "Not implemented. Validate permissible use and deletion/retention requirements first.",
    terms: "https://developers.google.com/youtube/terms/developer-policies",
    usage:
      "No videos/comments collected. Quotas and retention not assessed for this application.",
  },
  {
    id: "projects",
    name: "Project / contractor platforms",
    category: "Hiring and projects",
    method: "Future documented API or explicitly reusable feed",
    status: "unavailable",
    credentials: "Source-specific; no chosen provider",
    setup:
      "No integration yet. HN buyer requests already adapt into client findings; employment posts stay jobs.",
    terms: null,
    usage:
      "No provider selected; no access, quota or retention permissions claimed.",
  },
  {
    id: "apollo",
    name: "Apollo",
    category: "B2B databases",
    method: "Future approved API",
    status: "setup_required",
    credentials: "API credentials and permitted plan access",
    setup:
      "Not implemented in HassanOS. An external connector does not connect this application automatically.",
    terms: "https://docs.apollo.io/",
    usage:
      "No contacts imported. Free entitlement, permitted purpose, quotas and retention must be established first.",
  },
  {
    id: "signals",
    name: "News / funding / launches",
    category: "News and signals",
    method: "Future licensed/reusable feed",
    status: "unavailable",
    credentials: "Source-specific; no chosen provider",
    setup:
      "No integration yet; public visibility must not be treated as buying intent.",
    terms: null,
    usage: "No feed selected or stored. Reuse/retention conditions unassessed.",
  },
  {
    id: "github",
    name: "GitHub ecosystem",
    category: "Developer ecosystem",
    method: "Future official API",
    status: "setup_required",
    credentials: "Token where required; account/terms/quotas review",
    setup:
      "Not implemented for discovery. Repository Git access is unrelated to provider connection.",
    terms:
      "https://docs.github.com/en/site-policy/github-terms/github-terms-of-service",
    usage:
      "No developer prospect data collected. An issue is not paid demand; no fuzzy inference of buying intent.",
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    category: "Communities",
    method: "No permitted discovery integration established",
    status: "restricted",
    credentials: "Approved access, if available",
    setup: "Not implemented. No automated LinkedIn retrieval or scraping.",
    terms: "https://www.linkedin.com/legal/user-agreement",
    usage: "No access/retention permission claimed; no data collected.",
  },
] as const;
