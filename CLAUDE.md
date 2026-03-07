# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gridio Flex — Proof of Concept A1**

Gridio is an EV aggregator. This webapp prototype demonstrates the Gridio Flex concept: using an EV fleet as a source of flexibility that energy retailers can access for grid balancing or system services (e.g., frequency response, demand-side flexibility).

The prototype is for internal/stakeholder demonstration, not production use.

## Tech Stack

- **Frontend**: React 19 + Vite 7 + TypeScript 5
- **Styling**: Tailwind CSS v4 + shadcn/ui
- **Charts**: Recharts (ComposedChart, Bar, Line, ReferenceLine)
- **Routing**: React Router v6
- **Date utils**: date-fns
- **API server**: Hono v4 + @hono/zod-openapi (Node.js, port 3000)
- **Testing**: Vitest + React Testing Library
- **Linting**: ESLint 9 (flat config) + Prettier 3
- **CI/CD**: GitHub Actions + Vercel
- **Package manager**: npm

## Commands

```bash
npm run dev          # Start both frontend (5173) and API server (3000) concurrently
npm run build        # Production build
npm run preview      # Preview production build locally
npm run lint         # Run ESLint
npm run format       # Run Prettier (auto-fixes formatting)
npm run typecheck    # TypeScript type check (no emit)
npm run test         # Run all Vitest tests once
npm run test:watch   # Run Vitest in watch mode
```

API docs available at http://localhost:3000/api/docs (Swagger UI) when dev server is running.

## Domain Context

Key concepts relevant to this codebase:

- **EV Fleet**: The aggregated pool of electric vehicles whose charging/discharging can be dispatched.
- **Flexibility**: Adjustable energy load or generation capacity offered to the grid — either reducing consumption (upward flexibility) or increasing it (downward flexibility).
- **Energy Retailer**: The customer buying flexibility from Gridio to help balance their portfolio or meet system service obligations.
- **Balancing**: Real-time or near-real-time adjustment of supply/demand to keep the grid stable.
- **System Services**: Ancillary services (e.g., frequency containment reserve, fast frequency response) procured by grid operators.
- **Aggregator**: Gridio's role — aggregating many small EV assets into a dispatchable resource large enough to participate in flexibility markets.
- **DA market**: Day-Ahead market — prices published ~12:45 CET for the next full day (Nord Pool / EPEX). The "known price horizon" is today midnight before 13:00 CET, tomorrow midnight after 13:00.
- **mFRR**: Manual Frequency Restoration Reserve — one of the Flex 2.0 grid balancing products. TSO-dispatched, 12.5+ min response time.
- **Flex 1.0**: Artificial price curve sent to EV chargers. The trader sets internal prices to embed signals from DA spot, intraday, and mFRR windows. EVs shift charging toward low-price blocks. No TSO activation. Active when `flex2Enabled = false` in Settings.
- **Flex 2.0**: TSO-dispatched grid balancing. Trader submits capacity bids (MW, capacity price, energy price, availability window) per product. Settlement: capacity payment + energy payment − imbalance costs. Active when `flex2Enabled = true` in Settings.
- **FlexProduct**: `'fcr' | 'afrr' | 'mfrr' | 'id-balancing'` — universal product type for Flex 2.0 bids.
- **FCR**: Frequency Containment Reserve — symmetric, continuous, seconds-scale response.
- **aFRR**: Automatic Frequency Restoration Reserve — responds to AGC signal, minutes-scale.
- **ID balancing**: Intraday balancing product — opportunistic, shorter windows.
- **Capacity payment**: Fee for being available (€/MW/h × reserved MW × hours). Separate from energy payment.
- **Energy payment**: Fee for actual activation (€/MWh × activated MWh).
- **Imbalance cost**: Penalty for under-delivery (imbalance price × undelivered MWh).
- **Baseline**: Counterfactual load without activation. Direction convention: up activation → shiftedKwh < 0 (load reduced); down activation → shiftedKwh > 0 (load increased).
- **SoC headroom**: Up headroom = (avgSoC − 20%) × fleet capacity. Down headroom = (95% − avgSoC) × fleet capacity. Min buffer 20%, max 95%.

## Workflow

- **Never commit directly to `main`** — all changes go through a feature branch + PR.
- Branch naming: `feat/`, `fix/`, `docs/`, `chore/` prefixes.
- Pre-commit hook runs ESLint (auto-fix) + Prettier on every commit.
- CI pipeline: typecheck → lint → test → build. All must pass before merging.
- Plans are saved to `C:/_projects/gridio_flex_PA1/docs/plans/` before writing code.

## Project Structure

```
app_workspace/
├── server/
│   └── src/
│       ├── index.ts                  # Hono API server (port 3000)
│       ├── routes/
│       │   ├── fleet.ts              # GET /fleet/stats, GET /fleet/load
│       │   ├── priceCurve.ts         # GET/POST /price-curve, versioning
│       │   ├── simulation.ts         # POST /simulation/run
│       │   ├── bids.ts               # GET/POST /bids — Flex 2.0 bid timeline
│       │   ├── marketPrices.ts       # GET /market/reference-prices
│       │   └── soc.ts                # GET /fleet/soc
│       ├── services/
│       │   ├── priceService.ts       # Fetches real Belgian DA prices (energy-charts.info)
│       │   └── simulationClock.ts    # Server-side simulation clock (15-min ticks)
│       ├── schemas.ts                # Zod/OpenAPI schemas
│       └── store/
│           ├── bidStore.ts           # In-memory bid timeline store
│           └── priceCurveStore.ts    # In-memory price curve version store
├── src/
│   ├── api/
│   │   └── client.ts                 # Typed REST API client
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── ActivationTable.tsx       # Settlement activation log
│   │   ├── BidSummaryStrip.tsx       # Active bid chips per product (Flex 2.0 Dashboard)
│   │   ├── BidTimeline.tsx           # 24h drag-to-draw bid availability canvas (Flex 2.0)
│   │   ├── SoCChart.tsx              # Fleet SoC curve + up/down headroom areas
│   │   ├── FleetChart.tsx            # Main fleet load + price ComposedChart
│   │   ├── FlexibilityImpact.tsx     # KPI strip + delta bar chart
│   │   ├── LoadShiftChart.tsx        # Settlement DA shift bar chart (Flex 1.0)
│   │   ├── Layout.tsx                # App shell
│   │   ├── PeriodSelector.tsx        # 1D/1W/1M/1Y navigation
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
│   │   ├── usePeriodSelector.ts      # Period navigation state (1D/1W/1M/1Y, up to +1Y)
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

## Key Implementation Notes

### Data generation (`src/data/generators.ts`)

- `generateHistoricLoad(daysBack)` ends at `now` (not midnight) — ensures today's intraday blocks are included.
- `generateForecastLoad(daysAhead)` starts at the next 15-min boundary after `now`.
- Belgian DA price model: monthly base prices × seasonal intraday shape (duck curve in summer, double peak in winter) × weekend discount (12%).
- Negative price events: ~18% of summer days (Jun–Sep) trigger deeply negative midday blocks (−8 to −55 EUR/MWh). Same day always produces the same result (seeded by day index).
- Forecast uncertainty grows from ±10% near-term to ±40% at 1 year out.

### Chart x-axis alignment (`src/data/chartBuckets.ts`)

- `buildTimeBuckets(range, timeWindow)` and `getBucketLabel(timestamp, timeWindow)` must be used by both `FleetChart` and `FlexibilityImpact` to keep the delta bars aligned to the load bars.

### Period navigation (`src/hooks/usePeriodSelector.ts`)

- Forward navigation allowed up to 1 year from today. `isAtPresent` is true when further forward navigation would exceed this limit.

### DA price forecast horizon (`src/components/FleetChart.tsx`)

- `getDAKnownHorizon()` returns `endOfDay(tomorrow)` after 13:00 CET, `endOfDay(today)` before 13:00.
- Price data before the horizon uses `priceHistoric` (solid line); after uses `priceForecast` (dotted line).

### Recharts dark theme

- Always include `color: '#e2e8f0'` in Tooltip `contentStyle` and `itemStyle={{ color: '#e2e8f0' }}` — without this, tooltip text is invisible on dark backgrounds.

### Settings (`src/store/settingsStore.tsx`)

- Three toggles persisted to `localStorage` under `'gridio-flex-settings'`: `flex2Enabled` (renamed from `mfrrEnabled` — toggles between Flex 1.0 (price curve, `false`) and Flex 2.0 (grid balancing products, `true`)), `showForecast`, `realtimeSimulation`.
- Wrap the app in `<SettingsProvider>` (done in `App.tsx`); consume with `useSettings()`.

### SoC dynamics (`src/data/generators.ts`)

- `generateSoCCurve(date)` returns 96 × 15-min blocks with `avgSoCPct`, `pluggedInCount`, `upHeadroomKwh`, `downHeadroomKwh`.
- Plug-in rate peaks overnight (~85%), dips midday (~40%). SoC follows inverse pattern.
- Min buffer 20%, max 95%. Up headroom = (SoC − 20%) × count × avgBattery; down headroom = (95% − SoC) × count × avgBattery.

### Flex 1.0 price reference overlays

- `generatePriceReference(date)` returns DA spot (real from cache or generated), ID forecast (DA ± 8–12%), mFRR reference (DA + €15–35/MWh). `isForecast: true` for future blocks.
- Three toggleable overlay lines in Price Editor: DA Spot (amber/solid), ID Forecast (blue/dashed), mFRR Ref (violet/dotted).

### Flex 2.0 bid management

- `generateBidTimeline(date)` generates default bids for mFRR + ID balancing (always) + FCR + aFRR (conditional on date seed).
- BidTimeline component: 24h × 4-product drag-to-draw grid. Click+drag marks availability slots. Click filled slot → popover to edit MW and bid prices.
- Bids stored in server-side `bidStore.ts` (in-memory, same pattern as priceCurveStore).

### FleetChart kW/kWh fix

- `CAPACITY_KWH_PER_BLOCK = 820` (3280 kW × 15 min). Reference line shown only in 1D view.

### ActivationRecord direction convention

- `direction === 'up'` → load reduced → `shiftedKwh < 0` → emerald color in UI.
- `direction === 'down'` → load increased → `shiftedKwh > 0` → amber color in UI.
- Revenue = `capacityPaymentEur + energyPaymentEur − imbalanceCostEur`.

### DA load shift visualisation (`src/data/generators.ts` + `src/components/LoadShiftChart.tsx`)

- `generateLoadProfile(daysBack, applyPriceShift)` — internal helper. When `applyPriceShift=true`, flexible kWh is multiplied by a price-shift factor `(refPrice / effectivePrice)^0.45` clamped to [0.35, 1.9]. `refPrice` = midday DA price (hour 12) for the current month/day type.
- `generateHistoricLoad(daysBack)` — calls `generateLoadProfile(daysBack, true)` (Gridio-managed, price-shifted).
- `generateBaselineLoad(daysBack)` — calls `generateLoadProfile(daysBack, false)` (uncontrolled, plug-in-proportional).
- `generateLoadShiftBlocks(daysBack)` — pairs baseline + managed, returns `LoadShiftBlock[]` with `deltaKwh`, `daSpotEurMwh`, `savingsEur`.
- **FleetChart**: `showBaseline` prop renders a grey dashed "Uncontrolled baseline" line in 1D Flex 1.0 view only.
- **LoadShiftChart**: bars above zero = load added, below zero = load removed. Emerald = economically correct, amber = suboptimal. DA price line on right axis.
- **Settlement Flex 1.0 KPIs**: Baseline Cost / Actual Cost / DA Savings / Savings Rate — derived from `generateLoadShiftBlocks(365)` filtered to selected range.
