import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import type { ModelProvider } from '@chronicles/shared';

export interface LlmMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface LlmChatParams {
  provider: ModelProvider;
  model: string;
  systemPrompt: string;
  messages: LlmMessage[];
  /** Decrypted API keys keyed by env var name (from ApiKeysService.buildEnvForAgent) */
  apiKeys: Record<string, string>;
}

export interface LlmTool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AgenticRoundResult {
  text: string;
  toolCalls: ToolCall[];
  /** Raw Anthropic content blocks — feed verbatim into next assistant message */
  rawContent: Anthropic.Messages.ContentBlock[];
}

/** Message type for the agentic loop — supports both plain string and tool-use content */
export type AgenticMessage =
  | { role: 'user' | 'assistant'; content: string }
  | { role: 'assistant'; content: Anthropic.Messages.ContentBlock[] }
  | { role: 'user'; content: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> };

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  async chat(params: LlmChatParams): Promise<string> {
    const { provider, model, systemPrompt, messages, apiKeys } = params;

    const presentKeys = Object.keys(apiKeys);
    this.logger.log(
      `LLM call: provider=${provider} model=${model} msgs=${messages.length} keys=[${presentKeys.join(',')}]`,
    );

    try {
      if (provider === 'claude') {
        const key = apiKeys['ANTHROPIC_API_KEY'];
        if (!key) throw new Error('Anthropic API key not set — add it in Settings');
        return await this.callAnthropic(model, systemPrompt, messages, key);
      }

      if (provider === 'openai') {
        const key = apiKeys['OPENAI_API_KEY'];
        if (!key) throw new Error('OpenAI API key not set — add it in Settings');
        return await this.callOpenAICompat(model, systemPrompt, messages, { apiKey: key });
      }

      if (provider === 'openrouter') {
        const key = apiKeys['OPENROUTER_API_KEY'];
        if (!key) throw new Error('OpenRouter API key not set — add it in Settings');
        return await this.callOpenAICompat(model, systemPrompt, messages, {
          apiKey: key,
          baseURL: 'https://openrouter.ai/api/v1',
        });
      }

      if (provider === 'ollama') {
        return await this.callOpenAICompat(model, systemPrompt, messages, {
          apiKey: 'ollama',
          baseURL: 'http://localhost:11434/v1',
        });
      }

      throw new Error(`Unsupported provider: ${provider}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`LLM error [${provider}/${model}]: ${msg}`);
      throw new InternalServerErrorException(`LLM error: ${msg}`);
    }
  }

  /**
   * Single round of an agentic loop with tool use.
   * Only supported for Anthropic (Claude) models.
   * Returns the text response, any tool calls, and raw content blocks for the next turn.
   */
  async agenticRound(params: {
    model: string;
    systemPrompt: string;
    messages: AgenticMessage[];
    apiKey: string;
    tools: LlmTool[];
  }): Promise<AgenticRoundResult> {
    const { model, systemPrompt, messages, apiKey, tools } = params;
    this.logger.log(`agentic round: model=${model} tools=[${tools.map(t => t.name).join(',')}] msgs=${messages.length}`);

    try {
      const client = new Anthropic({ apiKey });
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt || undefined,
        messages: messages as Anthropic.Messages.MessageParam[],
        tools: tools as Anthropic.Messages.Tool[],
        tool_choice: { type: 'auto' },
      });

      const text = response.content
        .filter((b): b is Anthropic.Messages.TextBlock => b.type === 'text')
        .map(b => b.text)
        .join('');

      const toolCalls: ToolCall[] = response.content
        .filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === 'tool_use')
        .map(b => ({ id: b.id, name: b.name, input: b.input as Record<string, unknown> }));

      return { text, toolCalls, rawContent: response.content };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`agentic round error [${model}]: ${msg}`);
      throw new InternalServerErrorException(`LLM error: ${msg}`);
    }
  }

  private async callAnthropic(
    model: string,
    systemPrompt: string,
    messages: LlmMessage[],
    apiKey: string,
  ): Promise<string> {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system: systemPrompt || undefined,
      messages,
    });
    const block = response.content[0];
    return block.type === 'text' ? block.text : '';
  }

  private async callOpenAICompat(
    model: string,
    systemPrompt: string,
    messages: LlmMessage[],
    opts: { apiKey: string; baseURL?: string },
  ): Promise<string> {
    const client = new OpenAI({ apiKey: opts.apiKey, baseURL: opts.baseURL });
    const response = await client.chat.completions.create({
      model,
      messages: [
        ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
        ...messages,
      ],
    });
    return response.choices[0]?.message?.content ?? '';
  }
}
