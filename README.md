# Gridio Flex — Proof of Concept A1

Internal prototype demonstrating the Gridio Flex concept: using an EV fleet as a source of flexibility that energy retailers can access for grid balancing and system services.

> **Access:** The deployed app is password-protected. Ask the team for credentials.

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

Open http://localhost:5173 — no login required locally.

---

## Daily commands

```bash
npm run dev          # Start dev server (http://localhost:5173)
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

## Project structure

```
├── .github/workflows/ci.yml   # GitHub Actions CI pipeline
├── .husky/pre-commit           # Pre-commit hook (runs lint-staged)
├── src/
│   ├── components/             # React components
│   ├── test/setup.ts           # Vitest + Testing Library setup
│   ├── App.test.tsx            # Smoke test
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
├── middleware.ts               # Vercel Edge Middleware (HTTP Basic Auth)
├── eslint.config.js            # ESLint flat config
├── vite.config.ts              # Vite + Vitest + Tailwind config
└── .prettierrc                 # Prettier config
```

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

Claude will automatically pick up `CLAUDE.md` and know about the project commands, domain, and structure. You can then ask it to implement features, fix bugs, write tests, etc.

### Tips for this project

- **Ask in plain English** — e.g. "add a dashboard page showing fleet status" or "fix the lint error in App.tsx"
- **It commits for you** — Claude runs `git commit` when tasks are done; review the diff before confirming
- **Plans live in** `C:/_projects/gridio_flex_PA1/docs/plans/` — Claude saves implementation plans there before writing code
- **CLAUDE.md** is the source of truth for commands and project context — keep it updated as the project grows

---

## Tech stack

| Layer      | Technology                          |
| ---------- | ----------------------------------- |
| Framework  | React 19 + TypeScript 5             |
| Build tool | Vite 7                              |
| Styling    | Tailwind CSS v4                     |
| Testing    | Vitest + React Testing Library      |
| Linting    | ESLint 9 (flat config) + Prettier 3 |
| CI         | GitHub Actions                      |
| Hosting    | Vercel                              |
