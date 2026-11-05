# LaunchPad

Event check-in, live polling and an AI assistant for **LaunchPad Summit 2026**, a fictional one-day startup event.

Ushers check guests in at the door, checked-in attendees vote in live polls, organizers watch attendance and results update in real time, and a Gemini-powered assistant answers questions about the agenda, venue and polls.

> **Status:** in active development. Check-in, voting, the organizer dashboard and the AI assistant are done; the remaining screens are being built stage by stage. See [Project status](#project-status).

## Tech stack

| Area | Choice | Why |
| --- | --- | --- |
| Framework | [Next.js](https://nextjs.org) 16 (App Router, Cache Components) + React 19 | Server and UI code in one TypeScript project, deploys directly to Vercel |
| Styling | Tailwind CSS 4 | Design tokens in `globals.css`; charts are plain CSS bars, no chart library |
| Database | SQLite via [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts) | A local file in development; a hosted [Turso](https://turso.tech) database in production, with identical SQL |
| AI | Google Gemini (REST API via `fetch`, no SDK) | Event assistant grounded in live event data; defaults to `gemini-3.5-flash-lite`, Google's recommended fast, low-cost model |
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

Open <http://localhost:3000>. Staff pages (`/usher`, `/organizer`) ask for the `STAFF_PIN` you set in `.env.local`.

The seed script prints a few sample check-in codes (e.g. `LP-XVEH`) that you can use to test voting.

## Environment variables

Copy `.env.example` to `.env.local`. `.env.local` is git-ignored — never commit real secrets.

| Variable | Required | Purpose |
| --- | --- | --- |
| `GEMINI_API_KEY` | For the AI assistant | Google Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | No | Gemini model id. Defaults to `gemini-3.5-flash-lite` |
| `STAFF_PIN` | For staff pages | Shared PIN protecting the usher and organizer pages. If empty, nobody can log in as staff. Use 6+ digits |
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
| `npm test` | Run the unit tests (Node's built-in test runner via `tsx`, no extra dependencies) |
| `npm run db:seed` | **Reset** the database: 200 guests and 4 sample polls, nobody checked in |
| `npm run db:seed:demo` | Same, plus check-ins and votes so the dashboards have data to show |

> ⚠️ Both seed commands delete all existing guests, check-ins and votes.

## Features

| Page | Route | Who | What it does |
| --- | --- | --- | --- |
| Home | `/` | Everyone | Event details and links to each section |
| Staff login | `/staff/login` | Staff | Enter the staff PIN |
| Usher check-in | `/usher` | Staff | Live attendance numbers; search guests by name, organization or check-in code and check them in with one tap. Refreshes every 5 seconds so several ushers stay in sync |
| Live polls | `/attendee` | Attendees | Enter a check-in code (remembered on the device) to vote. Results appear after voting and update every 5 seconds |
| Organizer dashboard | `/organizer` | Staff | Live attendance, voter participation, full results for every poll (including hidden ones) and the latest arrivals, refreshed every 5 seconds. Each poll can be opened/closed and its results shown to or hidden from attendees |
| AI assistant | `/assistant` | Everyone | Chat with a Gemini-powered assistant about the agenda, venue, food, Wi-Fi and live poll results. Suggested questions to start; Enter to send |

### Staff access

Staff share one PIN (`STAFF_PIN`). A correct PIN sets an **httpOnly cookie** containing an HMAC token derived from the PIN, never the PIN itself. The token carries a signed expiry, so the server stops accepting it after 16 hours even if the cookie is copied to another device.

- `src/proxy.ts` redirects `/usher` and `/organizer` to `/staff/login` without a valid cookie, and returns `401` for `/api/usher/*` and `/api/organizer/*`.
- The staff API routes check the cookie again themselves, so they stay protected even if the proxy matcher changes.
- Changing `STAFF_PIN` logs out every staff device.
- Wrong PINs get a short delay, and each visitor gets 10 login attempts per 5 minutes (then `429 Too Many Requests`). Like the assistant's limit this is held in memory per server instance, so still use a PIN of at least 6 digits.

### API routes

| Method | Route | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Public | `200` if the database is reachable, `503` if not, plus whether the Gemini key, staff PIN and Turso URL are set (never their values) |
| `POST` | `/api/staff/login` | Public, rate-limited | `{ pin }` → sets the staff cookie |
| `POST` | `/api/staff/logout` | Public | Clears the staff cookie |
| `GET` | `/api/usher/guests?q=` | Staff | Matching guests (up to 50) plus attendance stats |
| `POST` | `/api/usher/checkin` | Staff | `{ guestId }` → `checked_in` or `already_checked_in` |
| `GET` | `/api/organizer/overview` | Staff | Attendance, voter count, all poll results and the 10 latest check-ins |
| `PATCH` | `/api/organizer/polls/:id` | Staff | `{ status?, showResults? }` → open/close a poll or show/hide its results |
| `POST` | `/api/assistant` | Public, rate-limited | `{ messages }` → `{ reply }` from Gemini |
| `POST` | `/api/attendee/polls` | Check-in code, rate-limited | `{ code }` → first name, check-in status and polls as that guest may see them |
| `POST` | `/api/attendee/vote` | Check-in code, rate-limited | `{ code, pollId, optionId }` → `voted`, or an error saying why not |

Attendee routes use `POST` so the check-in code (the attendee's only credential) stays out of URLs and server logs. Unknown codes get a short delay, and after 30 unknown codes in 5 minutes a visitor gets `429 Too Many Requests` until the window resets, so codes can't be found by brute force. Valid codes never count towards this, so the 5-second refresh is unaffected.

### AI assistant

`/api/assistant` builds a system prompt (`src/lib/assistantPrompt.ts`) from the event details in `src/data/event.ts` plus **live** attendance and poll results, fetched on every question, and sends it to Gemini (`src/lib/gemini.ts`).

- **Grounded:** told to answer only from that information, to stay on topic, and to say when it doesn't know.
- **Private:** no guest names, emails or codes are sent to Gemini, and polls with hidden results are described as "not yet announced", so the chatbot can't reveal results early.
- **Cost-limited:** questions are capped at 500 characters, only the last 10 messages are sent, replies are capped in length, and each visitor can ask 20 questions per 5 minutes. The rate limit is held in memory per server instance, so on Vercel it is a best-effort brake rather than a strict limit.
- **Fails gracefully:** a missing key, invalid key, Gemini rate limit, blocked prompt or timeout each show attendees a short, friendly message; technical details are only logged on the server.

### Rules the app enforces

- **Only checked-in guests can vote.** Others see the polls with voting locked; it unlocks on its own once an usher checks them in.
- **Results appear only after voting** (or when a poll closes), so live numbers don't sway undecided voters. Polls with `show_results` off never send counts to the browser at all, so they can't be read from developer tools either, until the organizer reveals them.
- **Closed polls reject votes**, including from attendee screens that haven't refreshed yet.
- **One vote per guest per poll.** This is enforced by a `UNIQUE (poll_id, guest_id)` constraint in the database, so it holds even if two requests arrive at the same moment.
- **A guest can only be checked in once.** The update only applies when `checked_in_at` is empty, so two ushers tapping at once can't double-count; the second sees "already checked in" with the original time.
- **Check-in codes are unique** (`UNIQUE` on `guests.checkin_code`) and matched case-insensitively.
- All SQL uses `?` placeholders, never string concatenation, to prevent SQL injection.
- Every response carries baseline security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, plus `Strict-Transport-Security` in production) set in `next.config.ts`, and the `X-Powered-By` header is turned off.

## Project structure

```
scripts/
  seed.ts              Resets and seeds the database
src/
  app/                 Routes (App Router) — one folder per page
    api/               Route handlers (staff, usher, organizer, attendee)
  components/
    layout/            Site header and page header
    staff/             Log out button shared by staff pages
    ui/                Reusable UI: Button, Card, Input, Badge, StatCard, ProgressBar, …
  data/                Event details, seed guests and seed polls
  lib/
    assistantPrompt.ts Builds the Gemini system prompt from event and live data
    attendee.ts        Builds the poll list each attendee is allowed to see
    auth/              Staff PIN tokens and the requireStaff() check
    gemini.ts          Gemini REST client
    rateLimit.ts       In-memory per-visitor rate limiter
    db/client.ts       Shared database connection (local file or Turso)
    db/schema.ts       Table definitions
    db/queries.ts      All SQL used by the app
    utils.ts           Small helpers (class names, percentages, time formatting)
  types/               Shared TypeScript types
  proxy.ts             Protects staff pages and APIs (Next.js 16's replacement for middleware)
tests/                 Unit tests: poll result visibility, staff PIN tokens, safe redirects, rate limiting, Gemini client (mocked fetch)
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
| 4 | Usher check-in dashboard and staff PIN protection | ✅ Done |
| 5 | Attendee voting | ✅ Done |
| 6 | Organizer live dashboard with poll controls | ✅ Done |
| 7 | Gemini AI assistant | ✅ Done |
| 8–10 | Polish, testing and Vercel deployment | ⏳ Next |

## Deployment (planned)

The app is designed for [Vercel](https://vercel.com). Vercel's filesystem is not persistent, so production uses a hosted Turso database instead of the local `launchpad.db` file:

1. Create a Turso database and copy its URL and auth token.
2. Seed it from your machine: put `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env.local` and run `npm run db:seed`.
3. Import the repository into Vercel and add all variables from the table above in the project settings.
4. After deploying, open `/api/health` on the live site: `"database": "ok"` and `"hostedDatabase": true` confirm it is talking to Turso.

## Notes

- The colour palette and fonts are neutral placeholders until the final brand guide is ready.
- `LaunchPad-Oxygene/`, if present locally, is a separate teammate prototype with its own repository. It is git-ignored and not part of this app.
