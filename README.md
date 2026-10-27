# HassanOS — Milestone 001

Local personal lead workspace. Node.js 20.9+ and PostgreSQL 14+ required.
No authentication is included. Keep the server on localhost; authentication is required before any public deployment. Both run scripts bind to `127.0.0.1`.

## Setup (PowerShell)

```powershell
npm.cmd ci
createdb -U postgres hassanos
Copy-Item .env.example .env.local
# Edit .env.local with your local PostgreSQL credentials.
npm.cmd run db:migrate
npm.cmd run dev
```

Open http://127.0.0.1:3000. `DATABASE_URL` can also be supplied through the environment. Never commit `.env.local`.

## Verification

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd start
```

With PostgreSQL running: create a lead with email `person@example.com`, refresh to confirm persistence, edit its status, search company/contact/email, and filter by status. Check overview totals against the list. Try creating another lead with `PERSON@example.com` (must fail), create multiple leads with blank emails (must succeed), and submit an empty company, malformed email, or invalid URL (must show field errors). Confirm edits can keep their original email.

## Schema changes

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
```

The initial migration is in `drizzle/`. List results are limited to the latest 500 matching records; overview counts include all records. Tests cover input validation; database-backed acceptance requires the manual verification above.
