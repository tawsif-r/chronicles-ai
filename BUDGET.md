# ChroniclesAI — Budget & Cost Report

> Pricing as of April 2026. LLM prices fluctuate — re-verify before making business decisions.

---

## Executive Summary

| Scenario | Monthly Fixed Infra | LLM Cost per PRO Client | Profitable? |
|----------|--------------------|-----------------------------|-------------|
| GPT-4o-mini stack | ~$37/mo | $2.50 | ✅ Yes (PRO = +$12.76) |
| Claude Haiku stack | ~$37/mo | $18.00 | ✅ Marginal (PRO = +$1.00) |
| Claude Sonnet stack | ~$37/mo | $53.50 | ❌ No (PRO = -$38.24) |

**Bottom line:** Current plan pricing ($19 PRO / $49 MAX) only works if clients default to GPT-4o-mini or Claude Haiku. Sonnet/Opus usage at scale bleeds money fast. See Section 8 for fix options.

**To launch:** ~$89 one-time. ~$37/mo fixed infra before any clients pay.

---

## 1. Infrastructure — Fixed Monthly Costs

These costs are constant regardless of client count. Amortize across clients as the base grows.

| Service | Provider | Plan | Monthly Cost |
|---------|----------|------|-------------|
| Compute (VPS) | Hetzner CX32 | 4 vCPU, 8 GB RAM, 80 GB SSD | €6.80 (~$7.35) |
| PostgreSQL + pgvector | Supabase Pro | 8 GB DB, 100 GB storage | $25.00 |
| Redis | Upstash Fixed | 100 GB data, unlimited commands | $5.00 |
| Domain + SSL | Cloudflare | Free tier (proxied, DDoS protection) | $0 |
| Domain registration | Namecheap/Porkbun | .com domain | $1.00 (amortized) |
| **Total fixed** | | | **~$38.35/mo** |

### Alternative Infra Stacks

| Stack | Monthly | Notes |
|-------|---------|-------|
| **Recommended (above)** | ~$38/mo | Best price/performance for early stage |
| Hetzner CX22 + Supabase Free + Upstash Free | ~$4/mo | MVP/testing only — DB limited to 500 MB |
| DigitalOcean 4GB + Railway Postgres + Upstash | ~$54/mo | Easier managed ops, higher cost |
| Railway all-in-one | ~$20–40/mo | Simple DevX, less control |
| AWS t3.small + RDS + ElastiCache | ~$80–120/mo | Overkill until 100+ clients |

---

## 2. LLM API Pricing (per 1M tokens)

### Anthropic Claude

| Model | Input | Output | Cached Input |
|-------|-------|--------|--------------|
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Claude Opus 4.7 | $5.00 | $25.00 | $0.50 |

> Batch API: 50% discount on all tokens. Prompt caching: 90% discount on repeated prefixes (system prompt reuse).

### OpenAI

| Model | Input | Output | Notes |
|-------|-------|--------|-------|
| GPT-4o | $2.50 | $10.00 | Best OpenAI quality |
| GPT-4o-mini | $0.15 | $0.60 | Best price/quality ratio |
| text-embedding-3-small | $0.02 | N/A | RAG embeddings |

---

## 3. Token Consumption Model (Per Message)

Estimated token breakdown for a single agent chat exchange:

| Component | Tokens | Notes |
|-----------|--------|-------|
| SOUL.md system prompt | ~500 | Agent personality + instructions |
| Chat history context | ~2,000 | Last ~10 exchanges (200 tokens each) |
| User message | ~50 | Typical user input |
| **Total input** | **~2,550** | |
| Agent response | ~200 | Typical assistant reply |

### Cost Per Message by Model

| Model | Input (2,550 tok) | Output (200 tok) | **Total/message** |
|-------|-------------------|------------------|-------------------|
| Claude Haiku 4.5 | $0.00255 | $0.00100 | **$0.0036** |
| Claude Sonnet 4.6 | $0.00765 | $0.00300 | **$0.0107** |
| Claude Opus 4.7 | $0.01275 | $0.00500 | **$0.0178** |
| GPT-4o-mini | $0.00038 | $0.00012 | **$0.0005** |
| GPT-4o | $0.00638 | $0.00200 | **$0.0084** |

> **With prompt caching** (same SOUL.md reused): Anthropic models get ~90% discount on the 500-token system prompt → Sonnet drops to ~$0.0093/msg.

---

## 4. RAG / Embedding Costs

ChroniclesAI uses `text-embedding-3-small` for document embedding via OpenAI.

| Operation | Tokens | Cost |
|-----------|--------|------|
| Embed 1 document chunk (avg 300 tokens) | 300 | $0.000006 |
| Embed 100-chunk workspace (full doc) | 30,000 | $0.0006 |
| Embed 1,000-chunk workspace (large doc set) | 300,000 | $0.006 |
| Search query embedding (~10 tokens) | 10 | $0.0000002 |

**Verdict:** RAG embedding costs are negligible — under $0.01 per workspace even for large document sets. Not a meaningful cost driver.

---

## 5. Per-Agent Monthly LLM Cost

Plan tier message limits: FREE = 100/mo, PRO = 5,000/mo, MAX = ~20,000/mo (assumed).

### Per Agent, Per Month

| Plan Tier | Model | Messages/mo | LLM Cost/mo |
|-----------|-------|-------------|-------------|
| **FREE** | GPT-4o-mini | 100 | **$0.05** |
| **FREE** | Claude Haiku 4.5 | 100 | **$0.36** |
| **FREE** | Claude Sonnet 4.6 | 100 | **$1.07** |
| **PRO** | GPT-4o-mini | 5,000 | **$2.50** |
| **PRO** | Claude Haiku 4.5 | 5,000 | **$18.00** |
| **PRO** | Claude Sonnet 4.6 | 5,000 | **$53.50** |
| **PRO** | GPT-4o | 5,000 | **$42.00** |
| **MAX** | GPT-4o-mini | 20,000 | **$10.00** |
| **MAX** | Claude Haiku 4.5 | 20,000 | **$72.00** |
| **MAX** | Claude Sonnet 4.6 | 20,000 | **$214.00** |
| **MAX** | Claude Opus 4.7 | 20,000 | **$356.00** |

> These costs scale **linearly per workspace**. Each client workspace is independent.

---

## 6. Per-Client Total Monthly Cost

Infrastructure is shared — divide fixed costs across active paying clients.

### Infrastructure Share by Client Count

| Active Clients | Infra/Client |
|----------------|-------------|
| 1 | $38.35 |
| 5 | $7.67 |
| 10 | $3.84 |
| 25 | $1.53 |
| 50 | $0.77 |
| 100 | $0.38 |

### Total Cost per Client (Infra share @ 10 clients + LLM)

| Client Tier | Model | Infra Share | LLM Cost | **Total/Client/Mo** |
|-------------|-------|-------------|----------|---------------------|
| FREE | GPT-4o-mini | $3.84 | $0.05 | **$3.89** |
| FREE | Claude Haiku | $3.84 | $0.36 | **$4.20** |
| FREE | Claude Sonnet | $3.84 | $1.07 | **$4.91** |
| PRO | GPT-4o-mini | $3.84 | $2.50 | **$6.34** |
| PRO | Claude Haiku | $3.84 | $18.00 | **$21.84** |
| PRO | Claude Sonnet | $3.84 | $53.50 | **$57.34** |
| MAX | GPT-4o-mini | $3.84 | $10.00 | **$13.84** |
| MAX | Claude Haiku | $3.84 | $72.00 | **$75.84** |
| MAX | Claude Sonnet | $3.84 | $214.00 | **$217.84** |

---

## 7. Multi-Agent Clients

Clients who run multiple agents multiply the LLM cost proportionally (each agent's messages counted separately). A PRO client running 3 active Claude Sonnet agents at full capacity:

```
3 agents × 5,000 msgs × $0.0107 = $160.50/mo LLM cost
Revenue: $19/mo
Net: -$141.50/mo
```

This is why per-agent limits (1 agent FREE, 10 agents PRO) are critical guards — but message limits apply per-workspace, not per-agent, so a client with 10 agents sharing 5,000 msgs/mo is still bounded.

---

## 8. Revenue vs Cost Analysis (Current Pricing)

Current plan prices: FREE = $0/mo, PRO = $19/mo, MAX = $49/mo.
Assuming 10 clients, model mix shown.

| Tier | Revenue | Cost (Sonnet) | Margin | Cost (Haiku) | Margin | Cost (GPT-4o-mini) | Margin |
|------|---------|--------------|--------|-------------|--------|---------------------|--------|
| FREE | $0 | $4.91 | **-$4.91** | $4.20 | **-$4.20** | $3.89 | **-$3.89** |
| PRO | $19 | $57.34 | **-$38.34** | $21.84 | **-$2.84** | $6.34 | **+$12.66** |
| MAX | $49 | $217.84 | **-$168.84** | $75.84 | **-$26.84** | $13.84 | **+$35.16** |

### Key Findings

1. **FREE tier always loses money** — you pay ~$4–5/client regardless of model. Acceptable as acquisition cost only if conversion to paid is high.
2. **PRO at $19 only works with GPT-4o-mini.** Claude Haiku barely breaks even (–$2.84). Claude Sonnet is a $38/mo loss per client.
3. **MAX at $49 is deeply underpriced for Sonnet/Haiku.** Only GPT-4o-mini yields positive margin.
4. **Model choice is the #1 cost driver**, not infra.

---

## 9. Recommended Pricing Adjustments

### Option A: Raise plan prices to cover Sonnet

| Plan | Current | Recommended (Sonnet) | Recommended (Haiku) |
|------|---------|---------------------|---------------------|
| FREE | $0 | $0 (loss leader, cap hard at 100 msgs) | $0 |
| PRO | $19 | $69/mo | $29/mo |
| MAX | $49 | $249/mo | $99/mo |

### Option B: Model-tiered pricing (recommended)

- FREE / PRO / MAX = all allow GPT-4o-mini and Claude Haiku → current pricing OK
- Add **"Premium Model Add-on"** for Sonnet/Opus at $X/1,000 messages
  - Sonnet: $15/1,000 msgs (~$0.015/msg, slight markup over $0.0107 cost)
  - Opus: $25/1,000 msgs (~$0.025/msg, slight markup over $0.0178 cost)

### Option C: Pass API cost through

- Client provides their own Anthropic/OpenAI API key (already supported in ChroniclesAI!)
- You charge flat platform fee ($9/mo PRO, $29/mo MAX) for the platform, not the LLM
- LLM costs are 100% client-side
- **This is the most sustainable model** and is already architecturally supported

---

## 10. Startup / One-Time Costs

| Item | Cost |
|------|------|
| Domain name (.com, 1 year) | ~$12 |
| First month Hetzner CX32 | $7.35 |
| First month Supabase Pro | $25.00 |
| First month Upstash Redis | $5.00 |
| Anthropic API credit (dev + testing) | $20.00 |
| OpenAI API credit (dev + testing) | $20.00 |
| **Total to launch** | **~$89.35** |

---

## 11. Cost Scaling Projections

Infra stays flat until ~50 concurrent clients on CX32. After that, upgrade to CX42 (8 vCPU, 16 GB, ~$16/mo) or add a second node.

| Clients | Fixed Infra | Avg LLM (GPT-4o-mini, PRO) | Total Monthly | Revenue (all PRO @ $19) | Net |
|---------|-------------|---------------------------|---------------|-------------------------|-----|
| 1 | $38.35 | $2.50 | $40.85 | $19 | -$21.85 |
| 5 | $38.35 | $12.50 | $50.85 | $95 | +$44.15 |
| 10 | $38.35 | $25.00 | $63.35 | $190 | +$126.65 |
| 25 | $38.35 | $62.50 | $100.85 | $475 | +$374.15 |
| 50 | $38.35 | $125.00 | $163.35 | $950 | +$786.65 |
| 100 | $55.00* | $250.00 | $305.00 | $1,900 | +$1,595 |

*Upgraded infra at 100+ clients

> **Break-even point** (GPT-4o-mini, PRO only): between 2–3 paying clients.

---

## 12. Summary Recommendations

1. **Default new agents to GPT-4o-mini or Claude Haiku** — steer users away from Sonnet/Opus until you've raised prices.
2. **Option C (bring-your-own key) is the best business model** — already built into ChroniclesAI. Market as a platform fee, not a token reseller.
3. **FREE tier is fine as acquisition** — cap strictly at 100 msgs/mo and 1 agent. At 10% conversion to PRO, each FREE client costs $4.91 to acquire a $19/mo subscriber.
4. **Infra is not the problem** — Hetzner + Supabase is cheap. LLM tokens are everything.
5. **Break-even at 5 clients** on PRO with GPT-4o-mini. Plan for that as the first milestone.

---

*Last updated: April 27, 2026*
