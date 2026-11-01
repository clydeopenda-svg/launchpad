# LaunchPad

Event check-in, live polling and an AI assistant for **LaunchPad Summit 2026**, a fictional one-day startup event.

Ushers check guests in at the door, checked-in attendees vote in live polls, organizers watch attendance and results update in real time, and a Gemini-powered assistant answers questions about the agenda, venue and polls.

> **Status:** in active development. The foundation (pages, UI kit, database, seed data) is done; the feature screens are being built stage by stage. See [Project status](#project-status).

## Tech stack

| Area | Choice | Why |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Cache Components) + React 19 | Server and UI code in one TypeScript project, deploys directly to Vercel |
| Styling | Tailwind CSS 4 | Design tokens in `globals.css`; charts are plain CSS bars, no chart library |
| Database | SQLite via [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts) | A local file in development; a hosted [Turso](https://turso.tech) database in production, with identical SQL |
| AI | Google Gemini | Event assistant (planned, Stage 7) |
| Language | TypeScript (strict) | |

## Getting started

### Prerequisites

- **Node.js 20.12 or newer** (the seed script uses `process.loadEnvFile`)
- npm

### Setup

```bash
git clone git@github.com:clydeopenda-svg/launchpad.git
cd launchpad
npm install
cp .env.example .env.local   # then fill in values — see below
npm run db:seed:demo         # create launchpad.db with sample data
npm run dev
```

Open <http://localhost:3000>.

The seed script prints a few sample check-in codes (e.g. `LP-XVEH`) that you can use to test voting.

## Environment variables

Copy `.env.example` to `.env.local`. `.env.local` is git-ignored — never commit real secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | For the AI assistant | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Gemini model name (`.env.example` uses `gemini-2.5-flash`) |
| `STAFF_PIN` | For staff pages | Shared PIN protecting the usher and organizer pages |
| `TURSO_DATABASE_URL` | In production | Hosted Turso database URL. Leave empty locally to use `launchpad.db` |
| `TURSO_AUTH_TOKEN` | In production | Auth token for the Turso database |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |
| `npm run db:seed` | **Reset** the database: 200 guests and 4 sample polls, nobody checked in |
| `npm run db:seed:demo` | Same, plus check-ins and votes so the dashboards have data to show |

> ⚠️ Both seed commands delete all existing guests, check-ins and votes.

## Features

| Page | Route | Who | What it does |
| --- | --- | --- | --- |
| Home | `/` | Everyone | Event details and links to each section |
| Usher check-in | `/usher` | Staff | Search guests by name, organization or check-in code and check them in |
| Live polls | `/attendee` | Attendees | Enter a check-in code to vote and see results |
| Organizer dashboard | `/organizer` | Staff | Live attendance and poll results |
| AI assistant | `/assistant` | Everyone | Ask questions about the event, agenda and polls |

### Rules the app enforces

- **Only checked-in guests can vote.**
- **One vote per guest per poll.** This is enforced by a `UNIQUE (poll_id, guest_id)` constraint in the database, so it holds even if two requests arrive at the same moment.
- **Check-in codes are unique** (`UNIQUE` on `guests.checkin_code`) and matched case-insensitively.
- All SQL uses `?` placeholders, never string concatenation, to prevent SQL injection.

## Project structure

```
scripts/
  seed.ts              Resets and seeds the database
src/
  app/                 Routes (App Router) — one folder per page
  components/
    layout/            Site header and page header
    ui/                Reusable UI: Button, Card, Input, Badge, StatCard, ProgressBar, …
  data/                Event details, seed guests and seed polls
  lib/
    db/client.ts       Shared database connection (local file or Turso)
    db/schema.ts       Table definitions
    db/queries.ts      All SQL used by the app
    utils.ts           Small helpers (class names, percentages, time formatting)
  types/               Shared TypeScript types
```

### Database

| Table | Holds |
| --- | --- |
| `guests` | Name, email, organization, ticket type, check-in code, check-in time |
| `polls` | Question, `open`/`closed` status, whether results are shown |
| `poll_options` | Answer options for each poll, in display order |
| `votes` | One row per guest per poll |

## Project status

| Stage | Work | Status |
| --- | --- | --- |
| 1–3 | Project setup, design tokens, UI kit, page shells, database schema, queries, seed data | ✅ Done |
| 4 | Usher check-in dashboard and staff PIN protection | ⏳ Next |
| 5 | Attendee voting | Planned |
| 6 | Organizer live dashboard (polling every ~5 seconds) | Planned |
| 7 | Gemini AI assistant | Planned |
| 8–10 | Polish, testing and Vercel deployment | Planned |

## Deployment (planned)

The app is designed for [Vercel](https://vercel.com). Vercel's filesystem is not persistent, so production uses a hosted Turso database instead of the local `launchpad.db` file:

1. Create a Turso database and copy its URL and auth token.
2. Seed it from your machine: put `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local` and run `npm run db:seed`.
3. Import the repository into Vercel and add all variables from the table above in the project settings.

## Notes

- The colour palette and fonts are neutral placeholders until the final brand guide is ready.
- `LaunchPad-Oxygene/`, if present locally, is a separate teammate prototype with its own repository. It is git-ignored and not part of this app.
