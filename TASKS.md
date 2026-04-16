# TASKS.md — ChroniclesAI Work Log

> Updated at the end of every session. Pick up from here on next start.

---

## Current Status
**App is running.** Backend :3000 · Frontend :5173 · Postgres + Redis in Docker.

---

## Last Completed (Session — April 16 2026)

### ✅ Theme toggle (dark / light)
- Created `frontend/src/contexts/ThemeContext.tsx` — persists to localStorage, toggles `.dark` on `<html>`
- Enabled Tailwind v4 dark mode via `@custom-variant dark` in `index.css`
- Sun/Moon toggle button at bottom of Sidebar

### ✅ Mobile / tablet responsive layout
- `Layout.tsx` — hamburger top bar on mobile, slide-in sidebar drawer with backdrop overlay
- Sidebar collapses on `< lg`, stays fixed on `lg+`
- All pages use responsive padding (`p-6 lg:p-8`)

### ✅ Nav active-state flicker fix
- Root cause: active NavLink added `border` that inactive links didn't have → layout shift
- Fix: always apply `border border-transparent`, only color changes on active

### ✅ Light/dark classes on all components
- All pages and components updated with `light default / dark:` Tailwind variants
- Files touched: Layout, Sidebar, StatusBadge, AgentCard, Dashboard, AgentDetail, AgentChat, AgentLogs, AgentMemory, AgentNew, Settings, Login, Register

### ✅ .gitignore cleanup
- Fixed `node_modules/` to match at all depths (was `/node_modules` — root only)
- Added `dist/`, `*.tsbuildinfo`, `**/.vite/`
- Removed already-tracked `frontend/node_modules/` from git index

---

## Open / Next Tasks

### 🔲 Verify OpenClaw gateway contract (Open Question #2)
- `chat/chat.service.ts:27` has a TODO — assumes `POST /{port}/message` `{ content }` → `{ reply }`
- **Blocks end-to-end chat.** Must confirm from OpenClaw source before testing.

### 🔲 Implement restart recovery (Open Question #1)
- `runtime.service.ts → onApplicationBootstrap` has a TODO
- On backend restart, agents with `status='running'` in DB should be marked `status='error'`
- Simple: query all running agents on boot, set to error, log warning

### 🔲 Test full chat flow end-to-end
- Depends on Open Question #2 being resolved first

### 🔲 Production hardening
- TypeORM: generate migration, set `synchronize: false`
- Set `WORKSPACE_BASE_PATH` to a persistent directory
- PM2 config for backend

---

## How to Run

```bash
# 1. Start infra
docker compose up postgres redis -d

# 2. Backend
pnpm dev:backend   # :3000

# 3. Frontend
pnpm dev:frontend  # :5173
```

See `design.md → Running Locally` for full setup steps.
