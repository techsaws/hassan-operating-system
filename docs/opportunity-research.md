# Opportunity research

Open **Opportunities** at http://127.0.0.1:3000/opportunities. This remains a localhost-only personal tool; the repository is intentionally public.

1. Create a campaign. The default name is **US Small Business — AI Automation**; other names and target services are supported. Membership is an operator assertion, not verified US geography or buying intent.
2. Capture one URL or incomplete manual research and assign its campaign. Saving never fetches a page or creates a CRM lead. Canonical URLs prevent repeated intake of the same page (fragments/tracking parameters removed).
3. Record the observed need and original public excerpt. Keep unknown fields empty. Record source dates and contact relevance only when known.
4. If website terms permit, explicitly confirm public access and click **Retrieve public page**. Otherwise open the source yourself and enter permitted evidence manually.
5. Select retrieved text or operator evidence before **Analyze opportunity**. Qwen uses the existing local adapter; start it as described in [local-ai.md](local-ai.md). Quotes must match supplied text. Service matching is an inference; generic background does not establish a need or earn need-based priority. No recorded evidence or CRM score is overwritten.
6. Follow the worklist's missing details and due follow-ups. **Human outreach review** requires all key research/contact fields; it never means independently verified buying intent. Clicking **Create / link CRM lead** deliberately creates a new-status lead, or links an existing email match without replacing its fields or drafts. Review before preparing outreach; sending remains manual.

## Supported retrieval

- One explicit request at a time; public static HTML/XHTML or UTF-8/plain-text pages on ordinary HTTP(S) ports. No JavaScript rendering, login sessions, cookies, authentication headers, link crawling, platform APIs, proxy rotation, CAPTCHA bypass, or background discovery.
- LinkedIn, Facebook, Instagram, X/Twitter, Upwork, Fiverr, Indeed, Glassdoor, Reddit, Wellfound, and Yelp are manual-only, including subdomains. This list is deliberately conservative and not an exhaustive catalogue of restricted websites. The operator must check terms for every source.
- `robots.txt` is checked with the honest `HassanOSResearch` agent before content. Disallow rules and positive crawl delays stop retrieval. Missing robots (404/410) permits access; other errors fail closed. Up to five safe robots redirects and three safe page redirects; no HTTPS downgrade.
- Public DNS addresses are validated on every request, including redirects and robots. Private, loopback, link-local, metadata, reserved, multicast, mapped/tunnel IPv6, IP-literal URLs, local hostnames, nonstandard ports, credential/token URLs, and mixed public/private DNS answers are refused.
- Connections are pinned directly to a validated address with the original Host header and TLS server identity; there is no second hostname lookup, connection pool, forwarded credential, or automatic redirect.
- Overall retrieval timeout: 15 seconds, including DNS. Each response: at most 512 KiB. Compressed responses, unsupported encodings/types, login/challenge pages, and restrictive robots headers/meta tags use manual entry.
- Raw pages are discarded. At most 4,000 characters of extracted text are stored with the actual final URL and successful retrieval timestamp. Operator evidence stays separate. A failed retry retains an explicitly dated previous successful excerpt; changing the source URL clears retrieved metadata.

Retrieval proves that text was obtained at a time and URL. It does not prove a company's identity, location, budget, buying intent, contact relevance, or that a quoted sentence describes a current need. AI output remains transient and requires human confirmation. Large, dynamic, restricted, or unsupported pages have a clean manual research path.

## Verification commands

```powershell
npm.cmd run db:migrate
npm.cmd test
npm.cmd run test:db
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
node --conditions=react-server --import tsx scripts/smoke-opportunity-ai.ts
```

The AI smoke check uses synthetic operator data and the actual local Qwen model. The one-off public retrieval smoke script was tested against `https://example.com/`; it is not a monitoring dependency or a prospect, and should not be repeatedly polled. Automated retrieval/security tests use mocks. No scraped or private prospect dataset belongs in Git.
