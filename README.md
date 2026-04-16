# ChroniclesAI

Web platform for creating, managing, and chatting with AI agents. Build custom agents with system prompts (no code), store encrypted API keys, and manage everything from one dashboard.

## Features

- **Agent Builder** — Create AI agents with custom SOUL.md (system prompt) and model selection
- **Web Chat** — Chat with agents directly in the browser
- **Multi-Model Support** — Claude (Anthropic), GPT (OpenAI), OpenRouter, Ollama
- **Encrypted API Keys** — Securely store and manage credentials per workspace (AES-256-GCM)
- **Dashboard** — Monitor agent status and activity
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

4. Run backend + frontend:
   ```bash
   pnpm dev:backend  # http://localhost:3000/api
   pnpm dev:frontend # http://localhost:5173
   ```

5. Register an account at `http://localhost:5173/register`

See `design.md` for full setup, architecture, and module overview.

## Project Status

- ✅ Backend modules (Auth, Users, Agents, Chat, Logs, API Keys)
- ✅ Frontend pages (Login, Dashboard, Chat, Logs, Memory)
- ✅ Styling (Tailwind v4, dark minimal design)
- 🔄 OpenClaw gateway integration in progress

## License

MIT
