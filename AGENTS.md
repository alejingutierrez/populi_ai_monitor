# Repository Guidelines

## Project Structure & Module Organization
Vite + React + TypeScript app with mock API and optional Neon-backed API. Key paths:
- `src/` app code and styles.
- `src/components/` UI components (PascalCase files).
- `src/data/` mock data generators.
- `public/` and `src/assets/` static assets.
- `mock-api/` Express mock API.
- `api/` Vercel serverless endpoints.
- `db/` Postgres schema/seed; `scripts/` helpers.
- `USER_STORIES.md` and `STATUS.md` for work tracking.
- `dist/` build output (do not edit by hand).

## Build, Test, and Development Commands
- `npm run dev` — start Vite dev server.
- `npm run build` — type-check and build to `dist/`.
- `npm run preview` — serve production build.
- `npm run lint` — run ESLint.
- `npm start --prefix mock-api` — run mock API on `http://localhost:4000`.
- `docker-compose up --build` — run frontend + mock API in containers.

## Coding Style & Naming Conventions
- TypeScript + React functional components; Tailwind for styling.
- Follow existing formatting: 2-space indent, single quotes, no semicolons.
- Component files in PascalCase; hooks/utilities in camelCase.
- Keep shared types in `src/types.ts` and domain helpers in `src/data/`.

## Testing Guidelines
No dedicated test runner. Validate with `npm run lint` and `npm run build`. If you add tests, document the framework and update `package.json` scripts.

## Agent Workflow & Project Context
- Every request must add/update a user story organized by area in `USER_STORIES.md` (Frontend, Backend/API, Data/DB, Infra/Deploy, Docs/Process).
- Always update `STATUS.md` with progress for the active story.
- Review `USER_STORIES.md` and `STATUS.md` at task start for full context.
- Always review the automatic deploy logs in Vercel after each push or task completion.

## Database (Neon/Postgres) Overview
Neon uses Postgres with `sentiment` and `media_type` enums. Core tables:
- `platforms`, `topics`, `clusters`, `subclusters`, `microclusters`, `locations`.
- `posts` with content, taxonomy, sentiment, timestamp, reach/engagement, media type.
- `classification_labels`, `post_classifications`, `post_actions`.
- `insight_requests`, `insight_snapshots` for analysis workflows.
See `db/schema.sql` for definitions and constraints.

## Commit & Pull Request Guidelines
Commit messages are short, imperative, and capitalized (e.g., “Fix treemap layout typing”). Keep commits focused. For PRs, include a brief summary, rationale, and UI screenshots/recordings when applicable.

## Security & Configuration Tips
Use `.env`/`.env.local` for local config. `VITE_API_BASE_URL` controls the frontend API target; `DATABASE_URL` enables Neon-backed queries. Do not commit secrets—update `.env.example` when adding new required vars.
