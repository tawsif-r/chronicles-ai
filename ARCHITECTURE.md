# ChroniclesAI — Architecture Guide

> For developers new to this codebase. Explains where each module lives, what it does, and how the pieces connect.

---

## Big Picture

ChroniclesAI is a platform for creating and managing AI agents. Each agent has a system prompt, a connected LLM, and optional channel integrations (Telegram, Slack, Discord, WhatsApp) so it can talk to users on those platforms.

```
Browser (React/Vite :5173)
        │
        │  REST API + WebSocket
        ▼
Backend (NestJS :3000)
        │
        ├─ PostgreSQL  (all persistent data)
        ├─ Redis       (Bull job queues for scheduled agents)
        └─ LLM APIs    (Anthropic, OpenAI, OpenRouter, Ollama)
```

---

## Monorepo Layout

```
chroniclesAi/
├── backend/src/        ← NestJS API server
│   ├── agents/
│   ├── api-keys/
│   ├── auth/
│   ├── billing/
│   ├── chat/
│   ├── discord/
│   ├── documents/      ← Document Vault + RAG (upload, chunk, embed, pgvector search)
│   ├── llm/
│   ├── logs/
│   ├── runtime/
│   ├── schedules/
│   ├── shared/         ← VectorColumn TypeORM decorator
│   ├── skills/
│   ├── tools/
│   ├── slack/
│   ├── telegram/
│   ├── users/
│   ├── whatsapp/
│   ├── workspaces/
│   └── app.module.ts   ← root module, registers everything
├── backend/db/init/    ← SQL init scripts (001_pgvector.sql)
├── frontend/src/        ← React + Vite SPA
│   ├── api/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   └── pages/
└── shared/              ← types/DTOs shared between frontend & backend
```

---

## Backend Modules

### `auth` — Login & Registration
**Path:** `backend/src/auth/`

Handles user registration, login, and JWT tokens. Every protected endpoint goes through `JwtAuthGuard`. Mark a route `@Public()` to skip the guard (used by webhook endpoints).

| File | Role |
|---|---|
| `auth.controller.ts:12` | `POST /api/auth/register`, `/login`, `/refresh`, `/me` |
| `auth.service.ts:17` | Hash passwords (bcrypt), issue access + refresh JWTs |
| `jwt.strategy.ts:16` | Decode JWT, attach `{ userId, workspaceId }` to request |
| `jwt-auth.guard.ts:8` | Blocks requests without a valid token (skipped if `@Public()`) |

**Flow:** `register` → creates user + workspace → returns JWT pair. `login` → verifies password → returns JWT pair.

---

### `users` — User Records
**Path:** `backend/src/users/`

Simple CRUD for the `User` entity. Only used internally by `auth` and `workspaces`.

| File | Role |
|---|---|
| `users.service.ts:8` | `findByEmail`, `findById`, `create` |

---

### `workspaces` — Workspace (Tenant) Records
**Path:** `backend/src/workspaces/`

Every user belongs to exactly one workspace. All agents, API keys, and billing are scoped to a workspace.

| File | Role |
|---|---|
| `workspaces.service.ts:11` | `createForUser` (called at registration), `findByUserId`, `findById` |

---

### `agents` — Agent CRUD + Channel Wiring
**Path:** `backend/src/agents/`

Core module. Manages agent records and their channel connections. When you add a channel (e.g. Telegram), this module calls the appropriate registration function to auto-register the webhook.

| File | Role |
|---|---|
| `agents.controller.ts:29` | REST endpoints for agent CRUD, start/stop/restart, channels, memory |
| `agents.service.ts:25` | Database logic + webhook registration dispatch |
| `agent.entity.ts` | DB table: name, systemPrompt, modelProvider, modelName, status, memory |
| `agent-channel.entity.ts` | DB table: type (telegram/slack/discord/whatsapp), config (JSON), enabled |

**Key methods:**
- `addChannel` (`:116`) — saves channel, then calls `registerTelegramWebhook` / `registerSlackWebhook` / `registerDiscordBot` / `registerWhatsappWebhook`
- `assertOwnership` (`:283`) — verifies agent belongs to caller's workspace before any mutation
- `getMemory` / `setMemory` (`:87`, `:97`) — read/write freeform JSON blob stored on the agent

---

### `chat` — Message Handling
**Path:** `backend/src/chat/`

The heart of the app. Receives a message, builds context from history, calls the LLM, saves both sides, logs events, increments billing counter.

| File | Role |
|---|---|
| `chat.controller.ts:17` | `POST /api/agents/:id/chat` (send), `GET` (history) |
| `chat.service.ts:15` | Orchestrates the full chat flow |
| `chat-message.entity.ts` | DB table: role (user/assistant), content, agentId |

**`sendMessage` flow** (`chat.service.ts:26`):
1. Load last 100 messages from DB as context
2. Call `LlmService.chat()`
3. Save user message + AI reply to DB
4. Log each step via `LogsService`
5. Call `BillingService.incrementMessageCount()`

---

### `llm` — LLM Provider Router
**Path:** `backend/src/llm/`

Single entry point for all LLM calls. Routes to the right SDK based on `agent.modelProvider`.

| File | Role |
|---|---|
| `llm.service.ts:24` | `chat()` — dispatches to Anthropic or OpenAI-compat |
| `llm.service.ts:70` | `callAnthropic()` — uses `@anthropic-ai/sdk` |
| `llm.service.ts:87` | `callOpenAICompat()` — handles OpenAI, OpenRouter, Ollama |

**Supported providers:** `anthropic`, `openai`, `openrouter`, `ollama`

API keys are passed in per-call (decrypted from DB by `ApiKeysService`), never stored in env at runtime.

---

### `api-keys` — Encrypted Key Storage
**Path:** `backend/src/api-keys/`

Stores LLM provider API keys per workspace, encrypted at rest with AES-256.

| File | Role |
|---|---|
| `api-keys.controller.ts:20` | `GET`, `POST`, `DELETE /api/api-keys` |
| `api-keys.service.ts:14` | `store` (encrypt + save), `listForWorkspace`, `remove`, `buildEnvForAgent` |
| `api-keys.service.ts:80` | `encrypt` / `decrypt` using `API_KEY_ENCRYPTION_SECRET` from env |

`buildEnvForAgent` (`:65`) returns a `Record<string, string>` of `{ ANTHROPIC_API_KEY, OPENAI_API_KEY, ... }` that gets passed to `LlmService.chat()`.

---

### `runtime` — Agent Start/Stop
**Path:** `backend/src/runtime/`

Controls agent lifecycle. Does **not** spawn processes — just flips `agent.status` in the DB and writes a log entry.

| File | Role |
|---|---|
| `runtime.service.ts:25` | `start` → sets status `running`, logs |
| `runtime.service.ts:32` | `stop` → sets status `stopped`, logs |
| `runtime.service.ts:43` | `restart` → calls stop then start |

---

### `logs` — Structured Event Logs
**Path:** `backend/src/logs/`

Persists timestamped log entries per agent. Frontend subscribes via WebSocket for live tail.

| File | Role |
|---|---|
| `logs.controller.ts` | `GET /api/agents/:agentId/logs` (paginated history) |
| `logs.gateway.ts` | WebSocket gateway — pushes new entries to subscribed clients |
| `logs.service.ts` | `create(agentId, level, message)` — called by ChatService and RuntimeService |
| `log.entity.ts` | DB table: agentId, level (info/debug/error), message, timestamp |

---

### `schedules` — Scheduled Agent Runs
**Path:** `backend/src/schedules/`

Runs an agent on a cron schedule using Bull + Redis. When the job fires, it calls `ChatService.sendMessage` and dispatches the reply to channels.

| File | Role |
|---|---|
| `schedules.controller.ts` | `GET/POST /api/agents/:id/schedules`, `PATCH/DELETE /:sid` |
| `schedules.service.ts` | Creates/removes Bull repeatable jobs. On `onModuleInit`, re-registers all enabled schedules from DB (survives restarts) |
| `schedule.processor.ts` | Bull processor — fires on cron trigger → calls ChatService → dispatches to Slack/Telegram/Discord |
| `schedule.entity.ts` | DB table: agentId, cronExpression, prompt, enabled, lastRunAt |

**Note:** WhatsApp is intentionally skipped in dispatch (no stored recipient number).

---

### `billing` — Plans, Subscriptions, Limits
**Path:** `backend/src/billing/`

Enforces per-workspace limits on agents, channels, and messages. Uses Redis for the monthly message counter (fast, no DB write per message).

| File | Role |
|---|---|
| `billing.controller.ts:12` | `GET /api/billing/me` (current plan + usage), `GET /plans`, `POST /upgrade` |
| `billing.service.ts:57` | All limit checks + counters |
| `plan-limit.guard.ts:14` | NestJS guard — reads `@PlanLimit()` decorator on routes, calls appropriate check |
| `null-payment.provider.ts:9` | Stub payment provider (no real Stripe integration yet) |
| `plan.entity.ts` | DB table: name, agentLimit, channelLimit, messageLimit |
| `subscription.entity.ts` | DB table: workspaceId → planId, resets monthly |

**Limit check methods** (all throw `ForbiddenException` if over limit):
- `checkAgentLimit` (`:133`)
- `checkChannelLimit` (`:152`)
- `checkMessageLimit` (`:173`)
- `incrementMessageCount` (`:187`) — writes to Redis, not Postgres

---

### Channel Modules — Slack, Telegram, Discord, WhatsApp

All four follow the same pattern:

```
Incoming webhook → Controller → Service.handleIncomingMessage()
                                    → ChatService.sendMessage()
                                    → send reply back to platform
```

#### `slack` (`backend/src/slack/`)
| File | Role |
|---|---|
| `slack.controller.ts:28` | `POST /api/webhooks/slack/events` — verifies Slack signature, routes to service |
| `slack.service.ts:11` | `verifySignature`, `findChannelBySlackEvent`, `handleIncomingMessage`, `sendMessage` |

Uses HMAC-SHA256 signature verification. Sends replies via `@slack/web-api` `WebClient`.

#### `telegram` (`backend/src/telegram/`)
| File | Role |
|---|---|
| `telegram.controller.ts:19` | `POST /api/webhooks/telegram/:token` |
| `telegram.service.ts:12` | `getBot` (caches `node-telegram-bot-api` instances by token), `handleIncomingMessage`, `sendOutbound` |

Webhook auto-registered on channel creation via `AgentsService.registerTelegramWebhook`.

#### `discord` (`backend/src/discord/`)
| File | Role |
|---|---|
| `discord.controller.ts:11` | `POST /api/webhooks/discord/init` — triggers bot login |
| `discord.service.ts:12` | Persistent `discord.js` client, listens for DMs, routes to ChatService |

Discord uses a persistent bot connection (not webhooks). The bot must be running to receive messages.

#### `whatsapp` (`backend/src/whatsapp/`)
| File | Role |
|---|---|
| `whatsapp.controller.ts:16` | `POST /api/webhooks/whatsapp` (Twilio form-encoded payload) |
| `whatsapp.service.ts:10` | `findChannelByPhoneNumber`, `handleIncomingMessage`, sends reply via Twilio SDK |

---

### `documents` — Document Vault + RAG
**Path:** `backend/src/documents/`

Upload documents (PDF/DOCX/TXT), chunk + embed via OpenAI, store in pgvector. Claude agents can search uploaded docs via the `search_documents` built-in tool.

| File | Role |
|---|---|
| `documents.service.ts` | `upload()`, `processDocument()` (parse→chunk→embed→save), `search()` (pgvector cosine), `onModuleInit()` (ALTER column + HNSW index) |
| `embedding.service.ts` | OpenAI `text-embedding-3-small`, batch 100, retry with backoff; key from `ApiKeysService.buildEnvForAgent` |
| `document.processor.ts` | Bull processor for `document-embedding` queue |
| `documents.controller.ts` | `POST /api/documents/upload` (202), `GET /api/documents`, `GET /api/documents/:id`, `DELETE /api/documents/:id`, `POST /api/documents/search` |
| `document.entity.ts` | id, workspaceId FK, filename, mimeType, sizeBytes, status, diskPath, chunkCount |
| `document-chunk.entity.ts` | text + `vector(1536)` column (stored as text, ALTERed on init) |

**Key notes:**
- pgvector: `pgvector/pgvector:pg16-alpine` image; `backend/db/init/001_pgvector.sql` creates extension
- `backend/src/shared/vector-column.ts` — custom TypeORM decorator for vector columns
- Disk path: `{WORKSPACE_BASE_PATH}/documents/{workspaceId}/{docId}/{filename}`
- Embeddings key pulled from workspace `OPENAI_API_KEY` — no `.env` change needed
- pdf-parse v2 API: `new PDFParse({ data: buffer })` then `.getText()`

---

### `tools` — Tool Use / Agentic Loop
**Path:** `backend/src/tools/`

Enables Claude agents to call built-in tools during a conversation. When an agent has `toolsMd` set to a valid JSON array, `ChatService` runs an agentic loop instead of a single LLM call — the LLM can request tool executions, get results fed back, and iterate up to 5 times before returning a final answer.

| File | Role |
|---|---|
| `tool-executor.service.ts` | Executes built-in tools by name; returns string result |
| `tools.module.ts` | NestJS module; imports `AgentsModule` + `WorkspacesModule` via `forwardRef` |

**Built-in tools:**

| Tool | What it does |
|---|---|
| `http_request` | GET/POST any public URL; blocks private IPs; 10s timeout; truncates at 4000 chars |
| `read_memory` | Reads the agent's `MEMORY.md` from disk |
| `write_memory` | Overwrites the agent's `MEMORY.md` on disk |
| `search_documents` | pgvector cosine similarity search across workspace documents; params: `query` (required), `limit`, `documentIds` |

**How to add tools to an agent:** Set `toolsMd` to a JSON array of tool definitions (Anthropic tool schema format). Empty or invalid JSON = tools disabled, falls back to normal chat.

**Only Claude (`modelProvider === 'claude'`) supports tool use.** Other providers fall through to the standard `LlmService.chat()` path unchanged.

**Agentic loop** lives in `ChatService.runAgenticLoop()` (`chat.service.ts:125`). `LlmService.agenticRound()` (`llm.service.ts:103`) handles each single Anthropic API call with tools.

---

### `skills` — Agent Skill Flags
**Path:** `backend/src/skills/`

Metadata for optional agent capabilities (feature flags). Currently read-only from the API; enable/disable logic exists but not wired to runtime behavior.

| File | Role |
|---|---|
| `skills.controller.ts:15` | `GET /api/skills` |
| `skills.service.ts:9` | `findAll`, `getAgentSkills`, `enableSkill`, `disableSkill` |

---

## How Modules Depend on Each Other

```
auth ──────────────► users
  └──────────────► workspaces

agents ────────────► workspaces
  └── on addChannel ► telegram / slack / discord / whatsapp

chat ──────────────► agents (load agent config)
  ├──────────────► llm (call LLM / agenticRound)
  ├──────────────► api-keys (decrypt keys for LLM)
  ├──────────────► logs (write events)
  ├──────────────► billing (increment message count)
  └──────────────► tools (execute tool calls in agentic loop)

tools ─────────────► agents (read/write MEMORY.md)
  ├──────────────► workspaces (resolve disk path)
  └──────────────► documents (search_documents tool)

documents ─────────► api-keys (OPENAI_API_KEY for embeddings)
  └──────────────► workspaces (scope + disk path)

schedules ─────────► chat (fire sendMessage on cron)
  └──────────────► slack / telegram / discord (dispatch reply)

runtime ───────────► agents (flip status)
  └──────────────► logs (write lifecycle events)

billing ───────────► workspaces (scope limits per workspace)
  └── PlanLimitGuard ► agents / chat controllers (enforce limits)
```

---

## Frontend Modules

**Path:** `frontend/src/`

### Pages

| Page | Path | What it does |
|---|---|---|
| `Login.tsx` | `/login` | JWT login form |
| `Register.tsx` | `/register` | New user registration |
| `Dashboard.tsx` | `/` | Lists all agents, create/delete |
| `AgentNew.tsx` | `/agents/new` | Create agent form |
| `AgentDetail.tsx` | `/agents/:id` | Tab bar: Overview / Schedules / Channels |
| `AgentChat.tsx` | `/agents/:id/chat` | Chat UI with message history |
| `AgentLogs.tsx` | `/agents/:id/logs` | Live log tail (WebSocket) |
| `AgentMemory.tsx` | `/agents/:id/memory` | Read/write agent memory blob |
| `Settings.tsx` | `/settings` | Manage LLM API keys |
| `Profile.tsx` | `/profile` | User profile |
| `DocumentsPage.tsx` | `/documents` | Upload docs, view list + status, tool JSON snippet |

### Key Hooks

| Hook | File | What it does |
|---|---|---|
| `useAgents` | `hooks/useAgents.ts` | React Query — CRUD for agents |
| `useChat` | `hooks/useChat.ts` | Fetch history + send messages (fetches last 200) |
| `useLiveLogs` | `hooks/useLiveLogs.ts` | HTTP history load → WebSocket subscribe for live tail |

### Key Components

| Component | File | What it does |
|---|---|---|
| `ChannelManager` | `components/ChannelManager.tsx` | Add/edit/delete channel connections per agent |
| `AgentCard` | `components/AgentCard.tsx` | Dashboard card with status badge + delete |
| `DocumentUpload` | `components/DocumentUpload.tsx` | Drag-and-drop dropzone with progress bar |
| `Layout` / `Sidebar` | `components/` | App shell with nav |

### API Client

`frontend/src/api/client.ts` — Axios instance. Attaches `Authorization: Bearer <token>` to every request. Token stored in `AuthContext`.

---

## Data Flow: Sending a Chat Message

```
User types message in AgentChat.tsx
    │
    │  POST /api/agents/:id/chat  { content: "..." }
    ▼
ChatController.send()
    │
    ▼
ChatService.sendMessage()
    ├── AgentsService.findOne()       ← load agent config + system prompt
    ├── ApiKeysService.buildEnvForAgent()  ← decrypt API keys for this workspace
    ├── getHistory()                  ← last 100 messages from DB
    ├── LlmService.chat()             ← call Anthropic / OpenAI / OpenRouter
    ├── save user message to DB
    ├── save AI reply to DB
    ├── LogsService.create() × N      ← log events
    └── BillingService.incrementMessageCount()
    │
    ▼
Return { reply: "..." } to frontend
    │
    ▼
AgentChat.tsx appends message to UI
```

---

## Data Flow: Channel Message (e.g. Telegram)

```
User sends message in Telegram
    │
    │  POST /api/webhooks/telegram/:token
    ▼
TelegramController.handleWebhook()
    │
    ▼
TelegramService.handleIncomingMessage()
    ├── findChannelByTelegram()       ← find which agent owns this chat ID
    └── ChatService.sendMessage()     ← same flow as above
        └── reply via TelegramService.sendOutbound()
```

---

## Environment Variables (quick ref)

| Variable | Used by | Purpose |
|---|---|---|
| `JWT_SECRET` | auth | Sign access tokens |
| `JWT_REFRESH_SECRET` | auth | Sign refresh tokens |
| `API_KEY_ENCRYPTION_SECRET` | api-keys | AES-256 key for stored LLM API keys |
| `DATABASE_URL` | typeorm | PostgreSQL connection |
| `REDIS_URL` | bull / billing | Redis connection |
| `WEBHOOK_BASE_URL` | agents | Public URL for auto-registering Telegram webhooks |

All secrets live in `backend/.env`. Copy from `backend/.env.example` to get started.

---

## Test Suite

80 unit tests across 13 suites. Run with:

```bash
cd backend && pnpm test
```

Tests use `@nestjs/testing` with mocked repositories (no real DB). See `TESTING.md` for full breakdown.

**Test utilities:** `backend/src/test-utils/mock-repo.ts` — returns a Jest-mocked TypeORM repository.
