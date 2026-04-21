# Agent Configuration Guide

> This guide explains the four configuration files for every agent. You don't need to be a developer to understand them — think of each one as a different "instruction sheet" you hand to your AI agent.

---

## The Big Picture

When you create an agent, you're essentially hiring a virtual employee. These four files are how you train them:

| File | Plain English | One-liner |
|---|---|---|
| **SOUL.md** | Who the agent *is* | Personality + instructions |
| **TOOLS.md** | What the agent can *do* | External actions it can take |
| **IDENTITY.md** | How the agent *appears* | Name, description, avatar |
| **HEARTBEAT.md** | What it does on a *schedule* | Notes for automated tasks |

---

## SOUL.md — The Personality & Instructions

**What it is:** This is the most important file. It's the set of instructions the AI reads before every single conversation. Think of it as the "employee handbook" you give to your agent. It tells the AI who it is, how to behave, what topics to focus on, and what to avoid.

**Non-technical explanation:** Imagine you're hiring a customer service rep. You'd give them a training manual: "You work for Acme Corp. Always be polite. Don't discuss competitor products. If someone asks for a refund, follow these steps..." SOUL.md is exactly that — but for your AI.

**What goes in here:**
- The agent's role and purpose
- Tone of voice (formal, casual, friendly, professional)
- What topics it should and shouldn't discuss
- Rules and guidelines it must follow
- Background knowledge or context it needs
- How it should format its responses

**Tips:**
- Be specific. "Be helpful" is vague. "Answer in 3 bullet points max, always include a source if asked about facts" is specific.
- Write it like you're talking directly to the agent. Use "You are..." and "You should..."
- The more context you give, the better the agent performs.

**Example:**

```
You are Aria, a friendly customer support agent for a software company called Launchpad.

Your job is to help users with billing questions, account issues, and general product questions.

Tone: Warm, professional, and patient. Never dismissive.

Rules:
- Always greet the user by name if they provide it.
- For refund requests, collect: order ID, reason, and date of purchase.
- Never promise refunds — say "I'll flag this for our billing team to review."
- If you don't know the answer, say so honestly and offer to escalate.
- Keep responses under 150 words unless a step-by-step explanation is needed.

You do NOT handle: technical bugs, feature requests, or sales inquiries.
For those, direct the user to: support@launchpad.com
```

---

## TOOLS.md — The Capabilities

**What it is:** A list of actions the agent is allowed to perform beyond just chatting. With tools, an agent can fetch information from the web, remember things across conversations, or call external services.

**Non-technical explanation:** By default, an agent can only talk. Tools are like giving it a phone, a notepad, and internet access. With `http_request`, it can look things up live. With `read_memory` and `write_memory`, it can remember things you told it in previous conversations.

**Important:** Tools only work with Claude (Anthropic) models. If your agent uses OpenAI or another provider, leave TOOLS.md empty.

**What goes in here:** A JSON array (a list in a specific format) of tool definitions. Each tool has:
- `name` — the tool's internal identifier
- `description` — tells the AI *when* to use this tool
- `input_schema` — what information the tool needs to run

**Built-in tools (available to all agents):**

| Tool name | What it does |
|---|---|
| `http_request` | Fetches a webpage or API endpoint and returns the content |
| `read_memory` | Reads everything stored in the agent's long-term memory |
| `write_memory` | Saves something to the agent's long-term memory |

**Tips:**
- The `description` field is crucial — the AI uses it to decide *when* to call the tool. Write it clearly.
- Start with just one or two tools. Too many tools confuses the agent.
- Leave TOOLS.md completely empty if you don't need tools. The agent will work fine without them.

**Example — agent that can look up live information:**

```json
[
  {
    "name": "http_request",
    "description": "Use this to fetch live data from a URL when the user asks about current information, prices, news, or anything that might change over time. Returns the raw page content.",
    "input_schema": {
      "type": "object",
      "properties": {
        "url": {
          "type": "string",
          "description": "The full URL to fetch, e.g. https://api.example.com/data"
        },
        "method": {
          "type": "string",
          "enum": ["GET", "POST"],
          "description": "HTTP method. Use GET for reading data, POST for submitting data."
        },
        "body": {
          "type": "string",
          "description": "Request body for POST requests. Use JSON format."
        }
      },
      "required": ["url"]
    }
  }
]
```

**Example — agent that remembers things:**

```json
[
  {
    "name": "read_memory",
    "description": "Read everything previously saved to your long-term memory. Use this at the start of a conversation to recall what you know about this user or their preferences.",
    "input_schema": {
      "type": "object",
      "properties": {}
    }
  },
  {
    "name": "write_memory",
    "description": "Save important information to long-term memory so you remember it in future conversations. Use this when the user shares preferences, important facts, or asks you to remember something.",
    "input_schema": {
      "type": "object",
      "properties": {
        "content": {
          "type": "string",
          "description": "The full content to save. This overwrites everything previously saved, so include all important info."
        }
      },
      "required": ["content"]
    }
  }
]
```

---

## IDENTITY.md — The Appearance & Description

**What it is:** A free-form description of the agent's public-facing identity — its display name, what it's for, and how it introduces itself. This is mostly used for display purposes and to give the agent a consistent persona when introducing itself to new users.

**Non-technical explanation:** Think of this as the agent's "business card" and "About Me" section. It doesn't change how the AI thinks (that's SOUL.md's job) — it just describes the agent for humans reading about it, and can help the agent introduce itself naturally.

**What goes in here:**
- Display name (can be different from the agent's internal name)
- Short description of what the agent does
- Intended audience
- Any avatar or persona details
- How the agent should introduce itself in a first message

**Tips:**
- Keep it short. A few lines is enough.
- You can use this to tell the agent how to greet new users.

**Example:**

```
Name: Aria
Role: Customer Support Specialist at Launchpad
Audience: Launchpad app users with billing and account questions

Description:
Aria is a friendly support agent who helps Launchpad users resolve account issues
quickly and without the frustration of long wait times.

First message (when starting a new chat):
"Hi! I'm Aria, Launchpad's support assistant. How can I help you today?
I'm best at billing questions and account issues — what's on your mind?"
```

---

## HEARTBEAT.md — The Schedule Notes

**What it is:** Notes and context for the agent's scheduled (automated) tasks. When you set up a schedule in the **Schedules tab**, the agent runs automatically at set times and sends a message to your connected channels (Telegram, Slack, etc.). HEARTBEAT.md is where you write notes, context, or instructions specifically for those automated runs.

**Non-technical explanation:** Think of it as the "shift briefing" you leave for an employee who works the night shift. They come in, read the briefing, and know exactly what to do without you being there. The actual schedule (when to run) is set in the Schedules tab — HEARTBEAT.md is just extra context to help the agent do its job when it runs automatically.

**What goes in here:**
- Context the agent needs for scheduled tasks
- What format the scheduled output should follow
- Who the audience is for automated reports
- Special instructions that only apply during automated runs
- Data sources or links the agent should check

**Tips:**
- If you only use the agent for manual chat and no scheduled tasks, leave this empty.
- Reference this in your SOUL.md if you want: *"When running on a schedule, follow the instructions in your heartbeat configuration."*
- Be specific about the output format — the result goes directly to a Slack/Telegram channel, so structure matters.

**Example — daily briefing agent:**

```
Scheduled Task: Daily Morning Briefing
Runs: Every weekday at 8:00 AM
Sends to: #team-updates (Slack)

What to include in each briefing:
1. A one-sentence motivational opener (keep it genuine, not cheesy)
2. Today's date and day of the week
3. 3 things the team should focus on today (pull from the latest context in memory)
4. One reminder about any ongoing deadlines

Format: Keep it under 200 words. Use bullet points. No long paragraphs.

Tone: Energetic but professional. Like a team lead doing a quick standup.
```

**Example — weekly report agent:**

```
Scheduled Task: Weekly Performance Summary
Runs: Every Friday at 5:00 PM
Sends to: #reports (Slack) and Telegram

Instructions:
- Summarize the week's key activity in 5 bullet points
- Flag anything that needs attention before Monday
- End with one positive highlight
- Use plain language — the audience is not technical

Data source: Check memory for any notes saved during the week before writing the summary.
```

---

## Quick Reference

| | SOUL.md | TOOLS.md | IDENTITY.md | HEARTBEAT.md |
|---|---|---|---|---|
| **Required?** | Yes | No | No | No |
| **Affects chat?** | Yes — directly | Yes — gives agent abilities | Indirectly | Only scheduled runs |
| **Format** | Plain text | JSON array | Plain text | Plain text |
| **Changed often?** | Sometimes | Rarely | Rarely | Sometimes |
| **Non-technical user?** | Write freely | Copy from examples | Write freely | Write freely |

---

## Common Mistakes

**SOUL.md too vague**
> ❌ `"Be a helpful assistant."`
> ✅ `"You are a support agent for Acme Corp. Answer only billing questions. Always ask for the order number before proceeding."`

**TOOLS.md wrong format**
> ❌ Writing a description in plain text
> ✅ Must be a valid JSON array starting with `[` and ending with `]`

**TOOLS.md with non-Claude model**
> ❌ Adding tools to an agent using GPT-4 or OpenRouter
> ✅ Tools only work with Claude (Anthropic) — leave TOOLS.md empty for other providers

**HEARTBEAT.md used for scheduling**
> ❌ Writing `"Run every Monday at 9am"` in HEARTBEAT.md and expecting it to work
> ✅ The actual schedule timing is set in the **Schedules tab** — HEARTBEAT.md is just context/notes
