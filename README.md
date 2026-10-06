# ChroniclesAI

Web platform for creating, managing, and chatting with AI agents. Build custom agents with system prompts (no code), store encrypted API keys, and manage everything from one dashboard.

## Features

- **Agent Builder** — Create AI agents with custom SOUL.md (system prompt) and model selection
- **Web Chat** — Chat with agents directly in the browser
- **Multi-Model Support** — Claude (Anthropic), GPT (OpenAI), OpenRouter, Ollama
- **Encrypted API Keys** — Securely store and manage credentials per workspace (AES-256-GCM)
- **Dashboard** — Monitor agent status, delete agents, manage everything
- **Channel Management** — Create/edit/delete channels (Telegram, Slack, Discord, WhatsApp) with auto-webhook registration
- **Setup Guides** — Built-in step-by-step instructions + code snippets for each channel type
- **Extensible Architecture** — Built-in hooks for Telegram, Slack, WhatsApp, Discord (channel plugins)

## Tech Stack

- **Backend:** NestJS + TypeScript, PostgreSQL, Redis, Bull queues
- **Frontend:** React + Vite, TypeScript, Tailwind v4
- **LLM:** Inline calls via @anthropic-ai/sdk and OpenAI SDK
- **Deployment:** Docker, monorepo with pnpm workspaces

## Quick Start

### Prerequisites

- Node.js 22+
- pnpm
- Docker + Docker Compose

### Setup

1. Clone and install:
   ```bash
   git clone <repo>
   cd chroniclesAi
   pnpm install
   ```

2. Configure env:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Fill in JWT secrets (see `design.md` for details).

3. Start services:
   ```bash
   docker compose up postgres redis -d
   ```


- This line was added as a test, i will merget this into the main branch, then i will roll it back to a previous commit.

4. Run backend + frontend:
   ```bash
   pnpm dev:backend  # http://localhost:3000/api
   pnpm dev:frontend # http://localhost:5173
   ```

5. Register an account at `http://localhost:5173/register`

See `design.md` for full setup, architecture, and module overview.

## Project Status

- ✅ Backend modules (Auth, Users, Agents, Chat, Logs, API Keys, Slack, Telegram, Discord, WhatsApp)
- ✅ Frontend pages (Login, Dashboard, Chat, Logs, Memory, Channel Management)
- ✅ Channel modules (Slack Events API, Telegram webhooks + auto-registration, Discord DMs, WhatsApp Twilio)
- ✅ Unit tests (80 tests, 100% pass — see `TESTING.md`)
- ✅ Channel CRUD (create/edit/delete channels) with embedded setup guides
- ✅ Styling (Tailwind v4, dark minimal design)
- 🔄 Production hardening, extend auto-webhook registration to Slack/Discord/WhatsApp, streaming responses

## License

MIT
