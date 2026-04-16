import express from 'express';
import * as fs from 'fs';
import * as path from 'path';

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const portIdx = args.indexOf('--port');
if (portIdx === -1 || !args[portIdx + 1]) {
  console.error('Usage: openclaw start --port <port>');
  process.exit(1);
}
const port = parseInt(args[portIdx + 1], 10);

// ── Config from env ───────────────────────────────────────────────────────────
const provider  = process.env.AGENT_MODEL_PROVIDER ?? 'claude';
const modelName = process.env.AGENT_MODEL_NAME     ?? 'claude-sonnet-4-6';

// ── SOUL.md from cwd (agent directory) ───────────────────────────────────────
const soulPath = path.join(process.cwd(), 'SOUL.md');
const soul = fs.existsSync(soulPath)
  ? fs.readFileSync(soulPath, 'utf8').trim()
  : 'You are a helpful AI assistant.';

// ── In-memory conversation history ───────────────────────────────────────────
const history: { role: 'user' | 'assistant'; content: string }[] = [];

// ── HTTP server ───────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

app.post('/message', async (req, res) => {
  const content: string = req.body?.content;
  if (!content) {
    res.status(400).json({ error: 'Missing content' });
    return;
  }

  history.push({ role: 'user', content });

  try {
    let reply: string;

    if (provider === 'claude') {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: modelName,
        max_tokens: 4096,
        system: soul,
        messages: history,
      });
      const block = response.content[0];
      reply = block.type === 'text' ? block.text : '';

    } else if (provider === 'openai' || provider === 'openrouter') {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: provider === 'openrouter'
          ? process.env.OPENROUTER_API_KEY
          : process.env.OPENAI_API_KEY,
        baseURL: provider === 'openrouter'
          ? 'https://openrouter.ai/api/v1'
          : undefined,
      });
      const response = await client.chat.completions.create({
        model: modelName,
        messages: [{ role: 'system', content: soul }, ...history],
      });
      reply = response.choices[0]?.message?.content ?? '';

    } else if (provider === 'ollama') {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: 'ollama',
        baseURL: 'http://localhost:11434/v1',
      });
      const response = await client.chat.completions.create({
        model: modelName,
        messages: [{ role: 'system', content: soul }, ...history],
      });
      reply = response.choices[0]?.message?.content ?? '';

    } else {
      reply = `Unsupported provider: ${provider}`;
    }

    history.push({ role: 'assistant', content: reply });
    res.json({ reply });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[openclaw] LLM error: ${msg}`);
    history.pop(); // remove failed user turn
    res.status(500).json({ error: msg });
  }
});

app.listen(port, '127.0.0.1', () => {
  // This exact string is parsed by runtime.service.ts to mark agent as 'running'
  console.log(`openclaw ready on port ${port}`);
});
