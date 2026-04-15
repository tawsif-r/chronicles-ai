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

## ADR-002: Dynamic Port Pool for OpenClaw Processes

**Decision:** RuntimeService manages a port pool (18800–19800). Each running agent is assigned a unique port, saved to `agent.gatewayPort` in DB.

**Rationale:** OpenClaw binds an HTTP gateway at a fixed port. Multiple agents running simultaneously need different ports. The port is tracked in DB so the frontend and ChatService know where to proxy messages.

**Trade-off:** Port range caps concurrent agents at 1000 per server. Acceptable for v1.

**Alternative considered:** Unix domain sockets per agent — avoids port exhaustion but OpenClaw may not support it without patching.

**Revisit when:** Running more than ~800 concurrent agents, or if we move to multiple servers.

---

## ADR-003: DB as Source of Truth for Config, EXCEPT MEMORY.md

**Decision:**
- `SOUL.md`, `TOOLS.md`, `IDENTITY.md`, `HEARTBEAT.md` → stored in DB, written to disk at agent start
- `MEMORY.md` → owned by OpenClaw at runtime, read/written directly from disk, NOT cached in DB

**Rationale:** OpenClaw writes to `MEMORY.md` continuously during execution. Syncing to DB on every write is unnecessary overhead and creates conflict risk. The Memory page reads from disk directly.

**Implication:** Never trust the DB for `memoryMd`. Always read from disk via `GET /api/agents/:id/memory`.

---

## ADR-004: Web Chat via Synchronous HTTP Proxy (v1)

**Decision:** `POST /api/agents/:id/chat` proxies the message to OpenClaw's HTTP gateway, waits for the response, and returns it. No streaming in v1.

**Rationale:** Simplest correct implementation. OpenClaw supports synchronous HTTP responses from its gateway.

**Trade-off:** Long-running agent responses (e.g., agents that run shell commands) will block the HTTP connection. Frontend should show a loading indicator.

**Revisit when:** Response times exceed acceptable UX thresholds. Switch to SSE (Server-Sent Events) or WebSocket-based streaming.

---

## ADR-005: API Keys Encrypted in DB, Injected at Start

**Decision:** LLM provider API keys (Anthropic, OpenAI) are AES-256-GCM encrypted and stored in the `api_key` table. At agent start, the relevant key is decrypted and injected as an environment variable into the OpenClaw child process.

**Rationale:** Keys must be stored somewhere. Encryption at rest mitigates risk from DB compromise. Injecting as env var at spawn time is how OpenClaw expects to receive them.

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

## Open Questions (still to resolve)

1. **Backend restart behavior** — *Lean toward (a): mark all `status='running'` as `status='error'` on startup.*
   Scaffolded with a `TODO` comment in `runtime.service.ts` → `onApplicationBootstrap`. Implement before first production deploy.

2. **OpenClaw HTTP gateway contract** — *Unresolved. Blocks `ChatService`.*
   Currently assumes `POST http://127.0.0.1:{port}/message` with body `{ content: string }` and response `{ reply: string }`. Marked with a `TODO` comment in `chat/chat.service.ts:27`. **Verify from OpenClaw source before testing chat.**

3. **OpenClaw binary location** — *Resolved via env var.*
   `RuntimeService` reads `OPENCLAW_BINARY` from `.env` (defaults to `openclaw`). Set it to a full path if OpenClaw is not in PATH. No code change needed.

4. **Auth token storage** — *Resolved: localStorage (see ADR-008).*
