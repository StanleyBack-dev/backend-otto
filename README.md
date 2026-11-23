# Otto — Backend

NestJS + **GraphQL** (Apollo, code-first) API for **Otto**, a personal voice
assistant. The desktop app (always listening on Windows) sends what was said;
this API understands it with an AI model and answers using its tools: the
day's agenda, the weather, yesterday's news and free questions ("o que é um
controller?", "como se fala isso em inglês?").

## Architecture

Same model as Dora: modular DDD with Ports & Adapters. Each module has its own
layers:

```
src/modules/<module>/
├── domain/                pure rules (no Nest, TypeORM, GraphQL) — lint blocks those imports
├── application/           use cases + ports (interfaces) — depends only on ports
├── infrastructure/        adapters (AI model, calendar, weather, RSS, persistence)
└── presentation/graphql/  resolvers, DTOs and mappers
```

- External services always sit behind a port, so swapping them is a new
  adapter: e.g. `LlmPort` → Gemini today, Claude later.
- GraphQL lives at `/graphql`. REST exists only for the health check (`GET /`)
  and the `/internal/*` routes called by the scheduled workflows
  (`CRON_SECRET`).
- Every request needs the `X-Client-Api-Key` header: only Otto's own clients
  know that key.
- Errors come as `{ message, extensions: { code, statusCode, details } }`
  (`AppException` + catalogs in `src/common/exceptions/catalogs`). Messages
  are user-facing, so they are written in Portuguese.
- GraphQL protections: introspection off in production, no playground, depth
  limit and alias limit.
- Logs go through `redact()`, which masks e-mails, phones and tokens.

### Planned modules

| Module          | Responsibility                                                       |
| --------------- | -------------------------------------------------------------------- |
| `identity`      | The owner's account and sessions (one user)                          |
| `assistant`     | Conversations: speech-to-text, the AI model and its tools            |
| `agenda`        | The day's events (Google Calendar through the Apps Script endpoint)  |
| `weather`       | Current weather and forecast (Open-Meteo)                            |
| `news`          | Headlines collected from RSS feeds                                   |
| `briefing`      | Morning briefing: agenda + weather + yesterday's news                |
| `system-logs`   | Errors and failed routines                                           |

### Schema

The schema is generated from the resolvers. `src/graphql/schema.gql`, which
the clients use to generate types, only comes from:

```bash
npm run schema:generate   # no database needed
```

CI fails if the file is outdated (`npm run schema:check`).

## Running locally

```bash
npm install
cp .env.example .env.local
npm run secrets:generate          # CLIENT_API_KEY, CRON_SECRET → .env.local
npm run start:dev                 # http://localhost:4100/graphql
```

## Deploy (Vercel)

Imported on Vercel with the variables from `.env.example` and
`NODE_ENV=production`. Production deploys run from GitHub Actions after CI
passes on `master` (added together with the database).

## Scripts

`npm test` · `npm run lint:check` · `npm run typecheck` · `npm run build` · `npm run schema:generate`
