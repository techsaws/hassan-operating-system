# HassanOS

Private lead workspace with Neon PostgreSQL, CSV import, deterministic qualification, local AI suggestions, and saved outreach drafts. Requires Node.js 20.9+. No authentication: keep the app on localhost. Both run scripts bind to `127.0.0.1`; public deployment requires authentication.

## Run (PowerShell)

`DATABASE_URL` is configured in the ignored project `.env`. Next.js loads it automatically; Drizzle reads the same file. Never commit credentials.

```powershell
Set-Location 'D:\Internal Systems\hassanos'
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run dev
```

Open http://127.0.0.1:3000. For a production build on localhost:

```powershell
npm.cmd run build
npm.cmd start
```

## Verify

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:db
npm.cmd run build
```

`test:db` uses the configured database, creates uniquely marked verification records, and removes them afterward. Run without simultaneous manual writes so count assertions remain stable.

## Schema changes

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```

CSV: UTF-8, comma-separated, maximum 1 MiB / 1,000 rows. Map columns and preview before importing. Invalid rows and duplicate nonempty emails are skipped. Blank emails are allowed and cannot be deduplicated. Valid records import in one transaction; existing records stay unchanged. Preview shows ten valid records and up to fifty row issues.

Qualification awards points only for operator-recorded evidence with source URLs: service fit 20, business need 30, contact relevance 15, reachability 15, buying signal 20. This is an evidence-completeness rubric, not independent verification or a probability of closing. Missing evidence earns zero. Scores and explanations update on save.

Lists show up to 500 matching leads; overview counts include all records.

## Local AI and outreach

See [local AI startup/configuration](docs/local-ai.md) and [measured Vulkan results](docs/local-ai-benchmark.md). Start llama.cpp in a separate terminal before using **Analyze lead** or **Draft outreach** in a saved lead. No website is fetched, no score is changed by AI, and no message is sent. Review and edit generated content, then explicitly save or copy it. Manual drafts remain available when the model is offline or disabled.

To run the real-model synthetic smoke checks after starting llama.cpp:

```powershell
node --conditions=react-server --import tsx scripts/smoke-local-ai.ts
```
