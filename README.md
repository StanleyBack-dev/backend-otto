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

| Module        | Responsibility                                                      |
| ------------- | ------------------------------------------------------------------- |
| `identity`    | The owner's account and sessions (one user)                         |
| `assistant`   | Conversations: speech-to-text, the AI model and its tools           |
| `agenda`      | The day's events (Google Calendar through the Apps Script endpoint) |
| `weather`     | Current weather and forecast (Open-Meteo)                           |
| `news`        | Headlines collected from RSS feeds                                  |
| `briefing`    | Morning briefing: agenda + weather + yesterday's news               |
| `system-logs` | Errors and failed routines                                          |

### Schema

The schema is generated from the resolvers. `src/graphql/schema.gql`, which
the clients use to generate types, only comes from:

```bash
npm run schema:generate   # no database needed
```

CI fails if the file is outdated (`npm run schema:check`).

## Identity and settings

- **One owner, many devices.** There is no sign-up: the account is created on
  boot from `BOOTSTRAP_OWNER_*` while the database has no user.
- Each `login` registers a **device** (desktop app, phone…) with its own
  refresh token, so the desktop stays signed in on its own. `removeDevice`
  signs one out at once (e.g. an old phone); changing the password signs out
  every other device.
- Every request after login sends `Authorization: Bearer <accessToken>`
  (15 min) and renews it with `refreshSession` (device kept for 90 days
  without use, sliding).
- **Nothing is fixed in the code**: language, time zone, voice speed and the
  location (`updateMyLocation`, reported by the device or typed) live in
  `tb_user_settings`. Weather and the briefing read the last known location.

## Assistant

- `ask(text, conversationId?)` sends the question (typed or transcribed) with
  the last messages of the conversation and the owner settings (name,
  language, time zone, place) to the AI model, behind `LlmPort`.
- **Gemini** (Google AI Studio, REST `generateContent`) today:
  `GEMINI_API_KEY` and `GEMINI_MODEL` (check which models the free tier
  covers in AI Studio). Another provider is a new adapter.
- **Tools**: feature modules register an `AssistantTool` in the
  `AssistantToolRegistry` (weather, agenda, news); the model calls them and
  a failing tool never breaks the answer.
- Only the text turns are stored (`tb_conversations`, `tb_messages`), and
  only when the answer exists. `myConversations` and
  `conversationMessages` are paged.

## Weather

- **Open-Meteo** (free for non-commercial use, no key; data CC BY 4.0,
  places from GeoNames).
- The assistant tool `get_weather` answers "qual o clima agora?", "vai
  chover amanhã?" and "e em Lisboa?": without a place it uses the last saved
  location, so moving only changes the settings.
- `weather(place?, days?)` for the app weather card; `searchPlaces(name)`
  to pick a city, then `updateMyLocation` saves it.
- Forecasts are cached in memory for 10 minutes (~1 km grid).

## Agenda

- Google Calendar through the owner's **Apps Script web app**
  (`integrations/google-apps-script/otto-agenda.gs`, install steps at the
  top of the file). It runs as the owner, so there is no Google Cloud OAuth
  to renew; `AGENDA_SCRIPT_TOKEN` is the credential and
  `AGENDA_SCRIPT_URL` the `/exec` URL. Changing accounts is publishing the
  script there and changing both variables.
- The assistant tool `get_agenda` answers "o que tenho hoje?", "qual o
  próximo compromisso?", "e amanhã?" with local times in the owner's time
  zone, plus what is happening now and the next event.
- `agenda(date?, days?)` for the app agenda screen (up to 7 days, cached
  for 2 minutes).

## News

- The owner chooses the **RSS/Atom feeds** (`addNewsSource`,
  `updateNewsSource`, `removeNewsSource`, up to 30) with a free category
  ("geral", "tecnologia", "Goiânia"…). Nothing is fixed in the code;
  `suggestedNewsSources` only helps to start. A feed is read when added, so
  a wrong link is refused at once; only public http(s) addresses are
  accepted.
- The **Routines** workflow calls `/internal/news/collect` at 06:00, 12:00
  and 18:00 (Brasília) and `/internal/news/cleanup` daily (headlines older
  than 14 days). Stale sources (6 h) are also refreshed before answering.
- The assistant tool `get_news` answers "quais as notícias de hoje/ontem?",
  optionally by category; `news(period, category, page)` is paged for the app.

## Database

PostgreSQL on **Neon** through TypeORM. The schema only changes through
migrations (`synchronize` is off), in `src/database/migrations`.

```bash
npm run migration:run      # applies the pending migrations (.env.local)
npm run migration:create   # new empty migration
npm run migration:revert   # undoes the last one
```

Use Neon's **pooled** connection string (host with `-pooler`): one database
branch for development and another for production.

## Running locally

```bash
npm install
cp .env.example .env.local        # fill DATABASE_URL
npm run secrets:generate          # CLIENT_API_KEY, CRON_SECRET → .env.local
npm run migration:run
npm run start:dev                 # http://localhost:4100/graphql
```

## Deploy (Vercel)

Imported on Vercel with the variables from `.env.example` and
`NODE_ENV=production`. After CI passes on `master`, the **Deploy Backend**
workflow runs the migrations on the production database and only then deploys
to Vercel (migration-first). It is skipped until these repository secrets
exist: `DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

The **Routines** workflow calls `/internal/maintenance/cleanup` every day
(system logs older than 90 days) once `API_URL` and `CRON_SECRET` are set.

## Scripts

`npm test` · `npm run lint:check` · `npm run typecheck` · `npm run build` · `npm run schema:generate` · `npm run migration:run`
