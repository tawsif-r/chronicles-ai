# architecture-decisions.md — ChroniclesAI

> Key design decisions, their rationale, and trade-offs.
> Update this when a major decision is made or revisited.

---

## ADR-001: One Workspace Per User (v1)

**Decision:** On registration, automatically create one Workspace for the user. No multi-user workspace support in v1.

**Rationale:** Simplifies auth guards — the JWT always carries the workspaceId, and every entity lookup is scoped to it. No workspace membership table needed.

**Trade-off:** Users can't share a workspace with teammates in v1.

**Revisit when:** There's demand for team accounts.

---

## ADR-002: No Child Processes — Inline LLM Calls (v1.1)

**Decision:** Removed agent child-process model. Agents are purely logical state in DB (status, config). Chat calls LLM inline via NestJS backend — no spawned processes, no port pool.

**Rationale:** Child-process overhead (port pool, restart recovery, binary management) exceeded value for simple chat. Direct calls via @anthropic-ai/sdk and OpenAI SDK are simpler, more testable, and sufficient for v1. Future channel integrations (Telegram, Slack) will be webhook handlers in NestJS, not child processes.

**Trade-off:** No long-running agent sessions per process. Agent context (conversation history) is DB-resident only, not an in-memory LLM loop. Acceptable since chat is request-response and conversation is stored in chat_message table.

**Architecture:** Agent `start` and `stop` just flip status in DB. No spawn, no ports, no process logs.

**Revisit when:** Need agent-owned long-running tasks (background jobs, scheduled actions), at which point we'd implement via Bull queue processors, not child processes.

---

## ADR-003: DB as Source of Truth for Config

**Decision:** Agent config (`SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `HEARTBEAT.md`) is stored in DB and never written to disk (no child process needed).

**Rationale:** No agent process, no on-disk config files. All config stays in agent table columns. LlmService reads from DB at request time.

**Implication:** File-based memory (MEMORY.md) is removed. Conversation history is DB-resident only (`chat_message` table).

---

## ADR-004: Inline LLM Calls (Chat)

**Decision:** `POST /api/agents/:id/chat` calls LLmService directly in NestJS. LLmService routes to Anthropic/OpenAI/OpenRouter SDK based on agent.modelProvider. No HTTP proxying.

**Rationale:** Simpler than child-process gateway. Direct SDK calls are faster, more testable, and no network latency.

**Flow:** 
1. ChatService loads last 100 messages from chat_message table (conversation context)
2. Appends user message
3. Calls LLmService.chat() with messages, SOUL.md, provider, model
4. LLmService picks correct SDK and calls it with decrypted API key
5. Reply saved to chat_message table
6. Response returned to frontend

**Trade-off:** No agent-owned background tasks yet. Future background jobs (e.g., scheduled actions) would use Bull queue processors.

---

## ADR-005: API Keys Encrypted in DB, Decrypted at Request Time

**Decision:** LLM provider API keys (Anthropic, OpenAI, OpenRouter) are AES-256-GCM encrypted and stored in the `api_key` table (scoped to workspace). At chat time, ChatService requests decrypted keys from ApiKeysService, passes them to LLmService.

**Rationale:** Keys must be stored somewhere. Encryption at rest mitigates risk from DB compromise. Decrypting at request time (not spawn time) avoids storing decrypted keys in environment.

**Flow:**
1. User adds key in Settings → POST /api/api-keys { provider, key }
2. ApiKeysService encrypts key and saves to DB
3. At chat time: ChatService calls apiKeysService.buildEnvForAgent(workspaceId)
4. Returns object { ANTHROPIC_API_KEY, OPENAI_API_KEY, OPENROUTER_API_KEY } — only decrypts what's in DB
5. Passed to LLmService.chat() — never persisted or logged

**Implication:** The encryption secret (`API_KEY_ENCRYPTION_SECRET`) is the crown jewel — must be in env, never committed.

---

## ADR-006: Chat History Stored in DB

**Decision:** Every chat message (user and assistant) is persisted to the `chat_message` table.

**Rationale:** Users need to reload the conversation after closing the tab. OpenClaw's own session memory handles context for the LLM, but we independently store the display history.

**Note:** This creates two records of "what was said": our DB (for display) and OpenClaw's MEMORY.md (for LLM context). They will generally be in sync but are not the same thing.

---

## ADR-007: IDOR Prevention — Always Scope by Workspace

**Decision:** Every service method that reads or writes an agent must verify `agent.workspace.id === user.workspaceId`.

**Rationale:** Without this check, a user who knows another agent's UUID could access it via `GET /api/agents/{other-users-agent-id}`. This is a classic IDOR vulnerability.

**Implementation:** AgentsService queries with `WHERE agent.id = :id AND agent.workspace = :workspaceId`. Never fetch by ID alone.

---

## ADR-008: Auth Token Storage — localStorage (v1)

**Decision:** Access and refresh tokens stored in `localStorage`.

**Rationale:** Simpler to implement for v1. No CSRF token handling needed. The app has no third-party scripts that would elevate XSS risk.

**Trade-off:** Vulnerable to XSS. If we ever add user-generated content or third-party scripts, revisit.

**Implementation:** `AuthContext.tsx` reads/writes `access_token` and `refresh_token` keys. The axios client in `api/client.ts` attaches the access token as a `Bearer` header and auto-refreshes on 401.

**Revisit when:** The app handles sensitive data or adds third-party script embeds.

---

## ADR-009: TypeORM `synchronize` — enabled in dev, disabled in prod

**Decision:** `TypeOrmModule` is configured with `synchronize: true` in non-production environments, `false` in production.

**Rationale:** Speeds up local development — no migration files needed while the schema is still in flux. In production, schema changes must be applied via explicit TypeORM migrations.

**Implication:** Before deploying to production, generate and review a migration: `pnpm typeorm migration:generate`.

---

## ADR-010: TypeScript `strictPropertyInitialization: false` for Entities

**Decision:** `strictPropertyInitialization` is disabled in `backend/tsconfig.json`.

**Rationale:** TypeORM entities declare columns as class properties without constructors. With `strict: true` (inherited from `tsconfig.base.json`), TypeScript raises TS2564 on every entity property. The standard TypeORM pattern relies on decorators to initialize fields, not constructors.

**Implication:** Entity properties may technically be `undefined` at runtime before TypeORM hydrates them. Trust TypeORM — never instantiate entity classes with `new` and access properties directly without loading from the DB first.

---

## ADR-011: `@chronicles/shared` — pnpm workspace symlink, no tsconfig `paths`

**Decision:** The backend resolves `@chronicles/shared` via pnpm's workspace symlink in `node_modules`, not via a `tsconfig.json` `paths` alias.

**Rationale:** Using `paths` to point to `../shared/src/index.ts` caused TypeScript to include the shared source in the backend compilation tree, nesting output under `dist/backend/src/` instead of `dist/`. pnpm workspace (`"@chronicles/shared": "workspace:*"` in `backend/package.json`) creates a symlink at `backend/node_modules/@chronicles/shared` → `../../shared`, which TypeScript resolves correctly through standard `node_modules` lookup. The same applies to the frontend via Vite's `resolve.alias` in `vite.config.ts`.

**Implication:** Do not add a `paths` entry for `@chronicles/shared` back to `backend/tsconfig.json`. If shared types don't resolve, check the pnpm symlink first: `ls backend/node_modules/@chronicles/shared`.

---

## ADR-012: Native Build Approvals — `pnpm.onlyBuiltDependencies`

**Decision:** Root `package.json` declares `pnpm.onlyBuiltDependencies` to allow native postinstall scripts for `@nestjs/core`, `bcrypt`, `esbuild`, and `msgpackr-extract`.

**Rationale:** pnpm v10 blocks postinstall scripts by default for security. These four packages require native compilation (`bcrypt` especially — it has a C++ addon). Approved in `package.json` so `pnpm install` runs unattended without an interactive prompt.

**Implementation:** `"pnpm": { "onlyBuiltDependencies": [...] }` in the root `package.json`.

---

## ADR-013: Circular Dependency — AgentsModule ↔ RuntimeModule

**Decision:** `RuntimeModule` imports `AgentsModule` via `forwardRef()` to break the circular dependency (Agents needs Runtime for start/stop controller methods; Runtime needs Agents for ownership checks and status updates).

**Implementation:** `runtime.module.ts` wraps the `AgentsModule` import with `forwardRef(() => AgentsModule)`.

---

## ADR-014: Tailwind v4 — `@tailwindcss/vite` Plugin, No Config File

**Decision:** Use Tailwind CSS v4 (not v3) in the frontend via the `@tailwindcss/vite` plugin.

**Rationale:** Tailwind v4 ships a first-class Vite plugin that requires zero config file. All customization is done in CSS via `@theme { }` blocks. This removes `tailwind.config.js` entirely, keeping the frontend leaner.

**Setup:**
- `pnpm add -D @tailwindcss/vite tailwindcss` in `frontend/`
- `vite.config.ts`: `plugins: [react(), tailwindcss()]`
- `src/index.css`: `@import "tailwindcss";` + `@theme { --font-sans: 'Inter', ...; }`

**Implication:** Do NOT add a `tailwind.config.js`. Custom colors and theme tokens go in `index.css` `@theme` block. Tailwind v4 utility classes are otherwise identical in syntax to v3.

---

## ADR-015: Icon Library — lucide-react

**Decision:** Use `lucide-react` for all UI icons.

**Rationale:** Clean SVG-based icons, tree-shakeable, consistent stroke weight, and first-class React support (`<Icon size={N} className="..." />`). Zero runtime overhead — each import is just a tiny SVG component.

**Usage:** `import { Bot, Send, Brain, Key } from 'lucide-react'` — import only what you use.

---

## ADR-016: Design System — Dark Minimal, Violet Accent, Inter Font

**Decision:** The frontend uses a curated design language inspired by Google AI Studio and Apple product pages:

| Token | Value | Usage |
|---|---|---|
| Base background | `bg-zinc-950` / `#09090b` | Page backgrounds |
| Surface cards | `bg-zinc-900` | Cards, panels, inputs |
| Border | `border-white/[0.08]` | Subtle borders everywhere |
| Accent | `violet-600` / `violet-500` | CTAs, active states, focus rings |
| Active nav | `bg-violet-600/15 text-violet-300 border-violet-500/20` | Sidebar active link |
| Text primary | `text-white` / `text-zinc-200` | Headings, body |
| Text muted | `text-zinc-500` / `text-zinc-600` | Labels, placeholders |
| Success | `emerald-500` | Running status, save confirmations |
| Warning | `amber-500` | Stopped/warning states |
| Error | `red-400` | Error states, delete actions |
| Font | Inter (Google Fonts) | All text via `@theme --font-sans` |
| Radius | `rounded-xl` / `rounded-2xl` | Cards; `rounded-lg` for buttons |

**Rationale:** Zinc neutrals recede visually. The single violet accent makes interactive elements immediately identifiable without visual noise. Glass-morphism borders (`border-white/[0.08]`) give depth without heavy shadows.

**Glass morphism pattern:** `bg-zinc-900 border border-white/[0.08] rounded-xl` — used on all cards, modals, and input containers throughout the app.

**Status dot pattern (StatusBadge):**
- `running` → `bg-emerald-500` with `animate-pulse`
- `starting` → `bg-amber-500` with `animate-pulse`
- `stopped` → `bg-zinc-600` static
- `error` → `bg-red-500` static

---

## ADR-017: Future Channel Architecture (Telegram, Slack, WhatsApp, Discord)

**Decision:** Channels will be implemented as NestJS modules that listen to webhooks. Each channel module:
- Listens to incoming messages (Telegram webhook, Slack Events API, etc.)
- Routes message to ChatService with agent ID
- Returns reply back through channel SDK

No child processes, no separate runtime. Agent is stateless from channel perspective.

**Pattern Example (Telegram):**
```
TelegramModule
├── telegram.controller.ts   — POST /webhooks/telegram/:token
├── telegram.service.ts      — sends/receives via Telegram SDK
└── Wires into ChatService:  POST /api/agents/:id/chat → save to chat_message table
```

**Flow:**
1. Telegram webhook → TelegramController
2. Extract message + chat ID from Telegram payload
3. Call ChatService.sendMessage(agentId, workspaceId, message)
4. Receive reply
5. Send reply back to Telegram via SDK

**Scope:** v1 stores channel config (token, chat ID) in AgentChannel table but does not implement channel modules yet.

---
