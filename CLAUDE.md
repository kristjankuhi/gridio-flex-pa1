# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Gridio Flex — Proof of Concept A1**

Gridio is an EV aggregator. This webapp prototype demonstrates the Gridio Flex concept: using an EV fleet as a source of flexibility that energy retailers can access for grid balancing or system services (e.g., frequency response, demand-side flexibility).

The prototype is for internal/stakeholder demonstration, not production use.

## Tech Stack

- **Frontend**: React (Vite)
- **Package manager**: npm (or bun — confirm once scaffolded)

## Commands

Once scaffolded with Vite, standard commands will be:

```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm run lint      # Lint (if configured)
```

## Domain Context

Key concepts relevant to this codebase:

- **EV Fleet**: The aggregated pool of electric vehicles whose charging/discharging can be dispatched.
- **Flexibility**: Adjustable energy load or generation capacity offered to the grid — either reducing consumption (upward flexibility) or increasing it (downward flexibility).
- **Energy Retailer**: The customer buying flexibility from Gridio to help balance their portfolio or meet system service obligations.
- **Balancing**: Real-time or near-real-time adjustment of supply/demand to keep the grid stable.
- **System Services**: Ancillary services (e.g., frequency containment reserve, fast frequency response) procured by grid operators.
- **Aggregator**: Gridio's role — aggregating many small EV assets into a dispatchable resource large enough to participate in flexibility markets.

## Project Structure

> This section should be updated once the codebase is scaffolded.
