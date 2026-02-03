# Repository Guidelines

## Project Intent
- Populi AI Monitor is a prototype dashboard to monitor social conversations in Puerto Rico with AI signals, geo coverage, and network analysis.
- The frontend consumes mock data (`src/data/localPosts.ts`) or an API (`mock-api/` locally, `api/` in Vercel) and applies global filters/search across all views.

## Project Structure & Module Organization
- `src/App.tsx` application shell, navigation, global filters/search, API base resolution, and derived metrics.
- `src/pages/` page-level views (Overview, Feed Stream, Geo Tagging, Network Connections, Alerts).
- `src/components/` UI components (PascalCase files), shared + page-specific.
- `src/data/` domain data builders (alerts, geo insights, network graph) + local posts generator.
- `public/` and `src/assets/` static assets.
- `mock-api/` Express mock API.
- `api/` Vercel serverless endpoints.
- `db/` Postgres schema/seed; `scripts/` helpers.
- `USER_STORIES.md` and `STATUS.md` for work tracking.
- `dist/` build output (do not edit by hand).

## Frontend Architecture (Source of Truth)
- `App.tsx` owns: posts, filters, search, nav state, API base resolution, and view routing.
- `resolveApiBase`: `VITE_API_BASE_URL` overrides; `localhost:5173` -> `http://localhost:4000`; `localhost:4173` -> `http://localhost:4001`; otherwise `/api`.
- Global filters are defined in `src/components/FilterBar.tsx` (`Filters` type) and applied in `App.tsx` to derive `filteredPosts`, `metrics`, `timelineData`, and `clusterStats`.
- `Header` = search + FilterBar; `Sidebar` = navigation; `InsightModal` = IA request CTA.

## Pages & Component Map
- Overview (`src/pages/OverviewPage.tsx`)
  - `SummaryGrid`, `TimelineChart`, `MapView`, `PostFeed`, `TopicPanel`, `ConversationTrends`.
- Feed Stream (`src/pages/FeedStreamPage.tsx`)
  - `SummaryGrid`, `FeedStreamList` (wraps `PostFeed`), `TrendRadar`, `SubConversationExplorer` (includes `TopicPanel`).
- Geo Tagging (`src/pages/GeoTaggingPage.tsx`)
  - `GeoPulse`, `MapView` (heatmap/clusters/sentiment layers), `GeoTerritoryIntel`, `GeoSentimentPanel`, `GeoTopicsPanel`, `GeoDrilldown`.
- Network Connections (`src/pages/NetworkConnectionsPage.tsx`)
  - `NetworkPulse`, `NetworkGraph`, `NetworkInsightsPanel`, `ConnectionMatrix`.
- Alerts (`src/pages/AlertsPage.tsx`)
  - `AlertsPulse`, `AlertsStream`, `AlertIntel`, `AlertTimeline`.
- Fallback
  - `ComingSoon` for non-wired nav labels.

## Shared UI Components
- `Header`, `Sidebar`, `FilterBar` (`SelectField`), `InsightModal`.
- `PostFeed` is the core feed list with density modes and action menu.
- `StreamPulse` exists but is not wired to any page (legacy or future use).

## Data & APIs
- `src/data/localPosts.ts` deterministic generator (7000 posts).
- `mock-api/` Express API (uses the same generator; optional Neon if `DATABASE_URL` is set).
- `api/` Vercel serverless endpoints (`/api/posts`, `/api/alerts`, etc.).
- `src/data/geoInsights.ts` builds city insights + risk/sentiment indices.
- `src/data/networkConnections.ts` builds co-occurrence graphs (author/day with city/day fallback).
- `src/data/alerts.ts` builds alerts, rule stats, and timelines from post windows.

## Visualization & Libraries
- MapLibre GL with Carto Voyager style for maps.
- D3 hierarchy/treemap for cluster drilldown.
- Recharts for timeline metrics.
- Framer Motion for UI motion.
- Headless UI for select fields.

## Styling & Design Tokens
- Tailwind with custom palette in `tailwind.config.js` (`prBlue`, `prRed`, `prWhite`, `prGray`, `ink`).
- `src/index.css` defines shared classes (`card`, `card-header`, `muted`, `h-section`, `filter-control`) and MapLibre popup styling.
- Typography: Manrope via Google Fonts.

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server.
- `npm run build` — type-check and build to `dist/`.
- `npm run preview` — serve production build.
- `npm run lint` — run ESLint.
- `npm start --prefix mock-api` — run mock API on `http://localhost:4000`.
- `docker-compose up --build` — run frontend + mock API in containers.

## Testing Guidelines
No dedicated test runner. Validate with `npm run lint` and `npm run build`. If you add tests, document the framework and update `package.json` scripts.

## Agent Workflow & Project Context
- Every request must add/update a user story organized by area in `USER_STORIES.md` (Frontend, Backend/API, Data/DB, Infra/Deploy, Docs/Process).
- Always update `STATUS.md` with progress for the active story.
- Review `USER_STORIES.md` and `STATUS.md` at task start for full context.
- Always review the automatic deploy logs in Vercel after each push or task completion.

## Vercel Auto-Deploy Troubleshooting
- If a `git push` does not create a deployment, confirm the commit SHA appears in Vercel deployments and the project is still linked to Git.
- A failing build will show as `ERROR` in Vercel; check logs for TypeScript/build errors first.
- If using a GitHub webhook to `api/github-deploy-hook`, ensure production alias points to a deployment that includes the endpoint (otherwise webhook pings return `404`). Promote the latest good deployment before testing.
- Avoid duplicate deployments: if Git integration is healthy, keep `ENABLE_GITHUB_DEPLOY_HOOK` unset/`false` (or remove the webhook) to prevent double deploys from Git + webhook.
- Vercel SSO protection can block webhooks with `401`. Disable SSO protection or add a bypass before validating the hook.
- If a webhook secret is used, update both the GitHub hook secret and the Vercel env value at the same time to avoid signature mismatches.
- Validate webhook delivery in GitHub hook deliveries; expect `200/202` for `ping` and `push` after fixing routing and protection.

## Database (Neon/Postgres) Overview
Neon uses Postgres with `sentiment` and `media_type` enums. Core tables:
- `platforms`, `topics`, `clusters`, `subclusters`, `microclusters`, `locations`.
- `posts` with content, taxonomy, sentiment, timestamp, reach/engagement, media type.
- `classification_labels`, `post_classifications`, `post_actions`.
- `insight_requests`, `insight_snapshots` for analysis workflows.
See `db/schema.sql` for definitions and constraints.

## Commit & Pull Request Guidelines
Commit messages are short, imperative, and capitalized (e.g., "Fix treemap layout typing"). Keep commits focused. For PRs, include a brief summary, rationale, and UI screenshots/recordings when applicable.

## Security & Configuration Tips
Use `.env`/`.env.local` for local config. `VITE_API_BASE_URL` controls the frontend API target; `DATABASE_URL` enables Neon-backed queries. Do not commit secrets—update `.env.example` when adding new required vars.
