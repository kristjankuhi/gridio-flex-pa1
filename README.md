# Gridio Flex — Proof of Concept A1

Internal prototype demonstrating the Gridio Flex concept: using an EV fleet as a source of flexibility that energy retailers can access for grid balancing and system services.

> **Access:** The deployed app is password-protected. Ask the team for credentials.

---

## Features

### Dashboard — Fleet Portfolio

- Real-time fleet overview: total capacity, opted-in flexibility, active EVs, average SoC
- Day-Ahead and Intraday market split stat rows (DA load, DA savings, ID adjustments, ID savings)
- mFRR stat row (conditional on Settings → mFRR Features toggle)
- Period selector with ← → navigation across 1D / 1W / 1M / 1Y windows, navigable up to 1 year into the future
- Fleet Load & Price chart (Recharts ComposedChart):
  - Stacked bars: opted-in flexible load vs non-flexible, translucent for forecast
  - Dual y-axis: kWh left, EUR/MWh right
  - Solid price line for known DA prices, dotted forecast line beyond the DA publication horizon (~13:00 CET for next-day prices)
  - Opted-in capacity ceiling reference line; "Now" marker
- Flexibility Impact strip: KPI cards (load shifted, cost savings, mFRR revenue) + delta bar chart aligned to the same x-axis buckets as the Fleet Load chart

### Price Editor (formerly Flex Editor)

- Select any date from today forward to edit the day-ahead price curve
- 96-block (15-min) price table with paste support (Excel/CSV friendly)
- Arrow-key keyboard navigation between price inputs
- Simulate button: shows baseline vs projected load chart
- Save & Activate: persists version to the API; Version History panel with restore

### Settlement

- Period selector (default 1W) over the full activation history
- Summary stat cards: total load shifted, DA/ID cost savings, mFRR revenue, total earned
- Activation log table with type filter (all / price-curve / mFRR) and expandable row detail (15-min block breakdown)
- Download CSV export

### Settings panel

- Gear icon in the top nav opens a slide-out sheet
- Three toggles persisted to `localStorage`:
  - **mFRR Features** — shows/hides mFRR stat cards and activation data (Flex 2.0)
  - **Show Forecast** — toggle forecast overlay on charts
  - **Real-time Simulation** — advance the simulation clock in real time

---

## Data model

All data is **simulated** — no real fleet or market data is read at runtime (except the optional Belgian DA price fetch at server startup).

### Price generation — Belgian DA market model

- Monthly base prices: Jan ~85 EUR/MWh → Jul ~38 EUR/MWh → Dec ~88 EUR/MWh (based on ENTSO-E / EPEX BE historical averages)
- Season-aware intraday shapes:
  - **Summer**: duck curve — solar suppresses midday (10:00–15:00) to ~15–50% of base; normal days stay low-but-positive
  - **Winter**: classic double peak (07:00–09:00, 17:00–20:00), high night floor
  - **Spring/Autumn**: intermediate
- **Negative price events**: ~18% of summer days (≈5–6/month) trigger deeply negative midday prices (−8 to −55 EUR/MWh at 13:00), matching real Belgian EPEX behaviour
- Weekend discount: 12%
- Forecast uncertainty grows with distance from now: ±10% near-term → ±40% at 1 year

### Price forecast horizon

The dotted forecast price line starts at the DA known-price horizon:

- Before 13:00 CET: tonight midnight (today's prices are the last known)
- After 13:00 CET: tomorrow midnight (next-day prices published at ~12:45 CET)

---

## Prerequisites

Install these once on a new machine:

- **Node.js 20+** — https://nodejs.org (LTS recommended)
- **Git** — https://git-scm.com
- **GitHub CLI** — https://cli.github.com (needed to create repos and manage PRs)
- **Claude Code** _(optional)_ — https://claude.ai/code — AI coding assistant, see [Claude Code setup](#claude-code-setup) below

---

## Getting started

### 1. Clone the repo

```bash
git clone https://github.com/kristjankuhi/gridio-flex-pa1.git
cd gridio-flex-pa1
```

### 2. Install dependencies

```bash
npm install
```

This also runs `husky install` automatically (sets up pre-commit hooks).

### 3. Start the dev server

```bash
npm run dev
```

Opens the React app at http://localhost:5173 and the API server at http://localhost:3000.

---

## Daily commands

```bash
npm run dev          # Start both frontend (5173) and API server (3000) concurrently
npm run test         # Run all tests once
npm run test:watch   # Run tests in watch mode
npm run lint         # Check for lint errors
npm run format       # Auto-fix formatting (Prettier)
npm run typecheck    # TypeScript type check without building
npm run build        # Production build (output: dist/)
npm run preview      # Preview the production build locally
```

---

## How the workflow works

### Pre-commit hook

Every `git commit` automatically runs:

1. ESLint (with auto-fix) on `.ts` / `.tsx` files
2. Prettier on `.ts` / `.tsx` / `.css` / `.md` / `.json` files

If either step fails, the commit is blocked. Fix the errors and try again.

### Branch & PR workflow

All changes go through a feature branch and pull request — never commit directly to `main`.

```bash
git checkout -b feat/my-feature
# ... make changes, commit ...
git push -u origin feat/my-feature
gh pr create
```

### CI (GitHub Actions)

Every push and pull request to `main` runs:

```
typecheck → lint → test → build
```

All steps must pass before merging. Check the **Actions** tab on GitHub to see results.

### Deployment (Vercel)

- Pushing to `main` triggers a production deployment automatically.
- Pushing any other branch creates a **preview deployment** with a unique URL.
- All deployments (production and preview) are protected by HTTP Basic Auth — use the team credentials to access them.

---

## Project structure

```
app_workspace/
├── server/
│   └── src/
│       ├── index.ts                  # Hono API server (port 3000)
│       ├── routes/
│       │   ├── fleet.ts              # GET /fleet/stats, GET /fleet/load
│       │   ├── priceCurve.ts         # GET/POST /price-curve, versioning
│       │   └── simulation.ts         # POST /simulation/run
│       ├── services/
│       │   ├── priceService.ts       # Fetches real Belgian DA prices (energy-charts.info)
│       │   └── simulationClock.ts    # Server-side simulation clock (15-min ticks)
│       ├── schemas.ts                # Zod/OpenAPI schemas
│       └── store/                    # In-memory price curve version store
├── src/
│   ├── api/
│   │   └── client.ts                 # Typed REST API client
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── ActivationTable.tsx       # Settlement activation log with expand/filter
│   │   ├── FleetChart.tsx            # Main fleet load + price ComposedChart
│   │   ├── FlexibilityImpact.tsx     # KPI strip + delta bar chart
│   │   ├── Layout.tsx                # App shell
│   │   ├── PeriodSelector.tsx        # ← 1D/1W/1M/1Y → navigation
│   │   ├── PriceTable.tsx            # 96-row editable price table
│   │   ├── SettingsPanel.tsx         # Gear icon + slide-out settings sheet
│   │   ├── SimulationChart.tsx       # Baseline vs projected result chart
│   │   ├── StatCard.tsx              # KPI card
│   │   ├── TopNav.tsx                # Navigation bar
│   │   └── VersionHistoryPanel.tsx   # Price curve version history
│   ├── data/
│   │   ├── chartBuckets.ts           # Shared x-axis bucket builder (FleetChart + FlexibilityImpact)
│   │   └── generators.ts             # Simulated data generators (fleet load, prices, activations)
│   ├── hooks/
│   │   ├── usePeriodSelector.ts      # Period navigation state
│   │   └── usePriceTableState.ts     # Price table edit state
│   ├── pages/
│   │   ├── Dashboard.tsx             # /dashboard
│   │   ├── PriceEditor.tsx           # /price-editor
│   │   └── Settlement.tsx            # /settlement
│   ├── store/
│   │   ├── priceCurveStore.tsx       # React Context price curve state
│   │   └── settingsStore.tsx         # React Context settings (localStorage-backed)
│   ├── types/
│   │   └── index.ts                  # Shared TypeScript types
│   └── App.tsx                       # Router + providers
├── .github/workflows/ci.yml          # GitHub Actions CI pipeline
├── .husky/pre-commit                 # Pre-commit hook (lint-staged)
├── middleware.ts                     # Vercel Edge Middleware (HTTP Basic Auth)
├── eslint.config.js                  # ESLint flat config
├── vite.config.ts                    # Vite + Vitest + Tailwind config
└── .prettierrc                       # Prettier config
```

---

## Setting up Vercel (if deploying from scratch)

If you need to connect a fresh Vercel project:

1. Go to https://vercel.com and sign in with GitHub
2. **Add New Project** → import `gridio-flex-pa1`
3. Keep all defaults (Vite preset, `npm run build`, `dist/`) and deploy
4. Go to **Settings → Environment Variables** and add:

   | Name              | Environments        |
   | ----------------- | ------------------- |
   | `BASIC_AUTH_USER` | Production, Preview |
   | `BASIC_AUTH_PASS` | Production, Preview |

5. Redeploy once after adding the env vars (they only take effect on the next deploy)

---

## Claude Code setup

[Claude Code](https://claude.ai/code) is an AI coding assistant that works in your terminal. The project includes a `CLAUDE.md` file that Claude reads automatically to understand the codebase, domain, and commands — no manual context-setting needed.

### Install

```bash
npm install -g @anthropic-ai/claude-code
```

### Authenticate

```bash
claude login
```

This opens a browser to sign in with your Anthropic account. You need a Claude Pro or Team subscription, or an API key from https://console.anthropic.com.

### Run

```bash
# From the app_workspace directory
claude
```

Claude will automatically pick up `CLAUDE.md` and know about the project commands, domain, and structure.

### Tips for this project

- **Ask in plain English** — e.g. "add a dashboard page showing fleet status" or "fix the lint error in App.tsx"
- **Always use PRs** — never commit directly to `main`; Claude will create a branch and open a PR
- **Plans live in** `C:/_projects/gridio_flex_PA1/docs/plans/` — Claude saves implementation plans there before writing code
- **CLAUDE.md** is the source of truth for commands and project context — keep it updated as the project grows

---

## Tech stack

| Layer      | Technology                                       |
| ---------- | ------------------------------------------------ |
| Framework  | React 19 + TypeScript 5                          |
| Build tool | Vite 7                                           |
| Styling    | Tailwind CSS v4 + shadcn/ui                      |
| Charts     | Recharts                                         |
| Routing    | React Router v6                                  |
| Date utils | date-fns                                         |
| API server | Hono v4 + @hono/zod-openapi (Node.js, port 3000) |
| API docs   | Swagger UI at http://localhost:3000/api/docs     |
| Testing    | Vitest + React Testing Library                   |
| Linting    | ESLint 9 (flat config) + Prettier 3              |
| CI         | GitHub Actions                                   |
| Hosting    | Vercel                                           |
