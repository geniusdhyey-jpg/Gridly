# Gridly

Gridly is a Vercel-ready opportunity discovery platform for students, builders, and young entrepreneurs. The checked-in catalog contains 237 active/upcoming records sourced from organizer-hosted Devpost pages and the public Grants.gov API. Every card links to the original source and shows its verification date.

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`.

## PostgreSQL setup

1. Create a PostgreSQL database (Vercel Marketplace → Neon is a straightforward option).
2. Run `db/postgres.sql` against that database.
3. Copy `.env.example` to `.env.local` and set `DATABASE_URL` and a long random `ADMIN_API_KEY`.
4. Restart the app. The public catalog continues to work if the database is unavailable; admin writes require PostgreSQL.

## Refresh official source data

```bash
pnpm sync:data
```

This refreshes the checked-in source snapshots from active/upcoming Devpost listings and the public Grants.gov API. It does not generate placeholder opportunities.

## Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, choose **Add New → Project**, import the repository, and set the root directory to `work/gridly` if this repository contains the wider workspace.
3. Vercel detects Next.js automatically. Keep the build command as `next build` and the output setting empty.
4. Add `DATABASE_URL` and `ADMIN_API_KEY` in **Project Settings → Environment Variables** for Production, Preview, and Development.
5. Deploy, then open `/admin` and use the same admin key for approved content changes.

## CSV import columns

`title, organizer, type, topic, summary, status, deadline, format, location, eligibility, cost, prizeAmount, benefit, officialUrl, sourceName, verifiedAt`

Use `|` between multiple eligibility rules. Duplicate `officialUrl` values are updated rather than inserted again.
